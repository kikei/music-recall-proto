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

Runtime configuration, readable only by root:

```sh
install -d -m 700 /etc/music-recall
cat > /etc/music-recall/env <<'ENV'
OIDC_ISSUER=https://<tenant>.logto.app/oidc
OIDC_AUDIENCE=<same as VITE_LOGTO_RESOURCE>
CREDENTIAL_SECRET=<openssl rand -base64 32>
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
YOUTUBE_API_KEY=
ENV
chmod 600 /etc/music-recall/env
```

`CREDENTIAL_SECRET` encrypts the API keys accounts enter. Losing it means every
account re-enters theirs; there is deliberately no recovery path. Keep a copy
somewhere other than the machine.

Then the unit:

```sh
cp deploy/music-recall.container /etc/containers/systemd/
systemctl daemon-reload
systemctl start music-recall
systemctl enable --now podman-auto-update.timer
```

The timer is what carries a merge to the server; it runs daily by default, and
`systemctl edit podman-auto-update.timer` shortens that. `podman auto-update`
takes an update immediately.

## The proxy

The container listens on `127.0.0.1:8787` and speaks plain HTTP. Terminate TLS
in front of it and pass everything through: the app serves the API and the
frontend together, so there is nothing to split by path.

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
