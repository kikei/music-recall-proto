// Shown when the sign-in environment variables are missing. Without this the
// app would fail while loading its config and leave a blank page, which is a
// confusing way to learn that .env is incomplete.
export function AuthSetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="sign-in">
      <h1>音楽想起エンジン</h1>
      <p className="error">サインインの設定が未完了です。</p>
      <p className="hint">
        .env に次の項目を設定してから、開発サーバを再起動してください。
      </p>
      <ul className="setup-missing">
        {missing.map(name => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className="hint">
        設定値は Logto のテナントで作成したアプリケーションと API
        リソースから取得できます。
      </p>
    </div>
  );
}
