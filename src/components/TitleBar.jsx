import { useApp } from '../App';

export default function TitleBar() {
  const { api, isElectron } = useApp();

  return (
    <div className="titlebar">
      <div className="titlebar__traffic">
        <button
          className="titlebar__dot titlebar__dot--close"
          onClick={() => isElectron && api.close()}
          aria-label="Close"
        />
        <button
          className="titlebar__dot titlebar__dot--min"
          onClick={() => isElectron && api.minimize()}
          aria-label="Minimize"
        />
        <button
          className="titlebar__dot titlebar__dot--max"
          onClick={() => isElectron && api.maximize()}
          aria-label="Maximize"
        />
      </div>
      <span className="titlebar__title">إدارة — android manager</span>
      <span className="titlebar__version">v1.0.0</span>
    </div>
  );
}
