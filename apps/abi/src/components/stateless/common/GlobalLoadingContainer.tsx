const GlobalLoadings = memo(() => {
  return (
    <div className="abi-startup-shell" role="status" aria-label="正在整理工作台环境">
      <aside className="abi-startup-shell__sidebar" aria-hidden="true">
        <div className="abi-startup-shell__brand" />
        <div className="abi-startup-shell__line" />
        <div className="abi-startup-shell__line" />
        <div className="abi-startup-shell__line" />
      </aside>
      <main className="abi-startup-shell__main" aria-hidden="true">
        <div className="abi-startup-shell__header" />
        <div className="abi-startup-shell__grid">
          <div className="abi-startup-shell__card" />
          <div className="abi-startup-shell__card" />
          <div className="abi-startup-shell__card" />
        </div>
      </main>
    </div>
  );
});

export default GlobalLoadings;
