# Deploying

One container and one volume, behind whatever proxy fronts the machine. The
image is built by GitHub Actions on every merge to `main` and published to
GHCR; the server pulls it.

```
merge to main -> Actions builds -> GHCR -> podman-auto-update pulls -> restart
```

The deployment is pull-based on purpose: nothing reaches in from outside, so
GitHub is never given a key to the machine.

## Repository settings

Repository variables (Settings → Secrets and variables → Actions → Variables).
Vite compiles these into the frontend bundle, so changing one needs a rebuild,
which `workflow_dispatch` on the publish workflow can do without a commit. They
are public identifiers, not secrets.

| Variable              | Value                         |
| --------------------- | ----------------------------- |
| `VITE_LOGTO_ENDPOINT` | `https://<tenant>.logto.app/` |
| `VITE_LOGTO_APP_ID`   | the SPA application's id      |
| `VITE_LOGTO_RESOURCE` | the API resource indicator    |

The published package must be public, or the server needs `podman login
ghcr.io` with a token that can read packages.

## Logto

Add the production URIs to the SPA application:

- redirect: `https://<domain>/callback`
- post sign-out: `https://<domain>`

The API resource must exist and its indicator must match `VITE_LOGTO_RESOURCE`
and `OIDC_AUDIENCE` exactly. Without one the provider issues an opaque token
that cannot be verified, and every request answers 401.

## Server

Podman runs rootless, as an ordinary user rather than root: a container that
gets out of its process still holds no privilege on the machine. Everything
below is that user's, except the env file's directory.

```sh
sudo loginctl enable-linger "$USER"
```

Lingering is what keeps the user's systemd running when nobody is logged in.
Without it the app stops at logout and does not return at boot.

Runtime configuration. It holds a secret, so it is readable only by the account
that runs the container:

```sh
sudo install -d -m 755 /etc/music-recall
sudo sh -c "umask 077; cat > /etc/music-recall/env" <<'ENV'
OIDC_ISSUER=https://<tenant>.logto.app/oidc
OIDC_AUDIENCE=<same as VITE_LOGTO_RESOURCE>
CREDENTIAL_SECRET=<head -c 32 /dev/urandom | base64 -w0>
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
YOUTUBE_API_KEY=
ENV
sudo chown "$USER" /etc/music-recall/env
```

`CREDENTIAL_SECRET` encrypts the API keys accounts enter. Losing it means every
account re-enters theirs; there is deliberately no recovery path. Keep a copy
somewhere other than the machine.

The player keys are the operator's own and may be left empty. They only fill in
automatic lookup when a session starts without a URL; pasting one works without
them.

Then the unit. Rootless units live under the user, not in `/etc`:

```sh
mkdir -p ~/.config/containers/systemd
cp deploy/music-recall.container ~/.config/containers/systemd/
systemctl --user daemon-reload
systemctl --user start music-recall
systemctl --user enable --now podman-auto-update.timer
```

The timer is what carries a merge to the server; it runs daily by default, and
`systemctl --user edit podman-auto-update.timer` shortens that. `podman
auto-update` takes an update immediately.

Quadlet names the container after the unit, so it is `systemd-music-recall` in
`podman ps` and in `podman logs`.

## The proxy

The container listens on `127.0.0.1:8787` and speaks plain HTTP. Terminate TLS
in front of it and pass everything through: the app serves the API and the
frontend together, so there is nothing to split by path. Loopback is the whole
of the container's exposure — the proxy is the only way in.

With Caddy on the host that is the entire configuration, certificate included:

```
<domain> {
	encode zstd gzip
	reverse_proxy 127.0.0.1:8787
}
```

Port 80 has to be reachable for the certificate to be issued and renewed. If it
is blocked, Caddy can still renew over 443 alone, but only if it is told to:
`tls { issuer acme { disable_http_challenge } }`.

## Rolling back

A container that comes up unhealthy is rolled back to the image it replaced. To
return to a known build:

```sh
podman pull ghcr.io/kikei/music-recall-proto:sha-<commit>
podman tag  ghcr.io/kikei/music-recall-proto:sha-<commit> \
            ghcr.io/kikei/music-recall-proto:latest
systemctl restart music-recall
```

Migrations apply as a new container starts, so a merge can change the schema.
Each one copies the database into `/data/backups` first, which is the way back
from a migration itself. Those copies accumulate; prune them if the volume is
small.
