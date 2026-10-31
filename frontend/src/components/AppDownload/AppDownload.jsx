
import { useEffect, useState } from "react";
import "./AppDownload.css";

const isAppleMobile = () => {
  if (typeof navigator === "undefined") return false;

  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const AppDownload = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [appleMobile] = useState(isAppleMobile);

  useEffect(() => {
    const standalone = window.matchMedia?.(
      "(display-mode: standalone)"
    ).matches;

    if (standalone || navigator.standalone === true) {
      setInstalled(true);
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowInstructions((current) => !current);
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <section
      className="app-download"
      id="app-download"
      aria-labelledby="app-download-title"
    >
      <p className="app-download-badge">Installable web app</p>

      <h2 id="app-download-title">
        Keep Elevoni close at hand.
      </h2>

      <p className="app-download-description">
        Add Elevoni to your home screen for quicker access.
        Browsing saved app files may work offline, but live
        products, accounts, orders and payments still need
        an internet connection.
      </p>

      {installed ? (
        <p className="app-download-status" role="status">
          Elevoni is installed on this device.
        </p>
      ) : (
        <button
          className="app-download-button"
          type="button"
          onClick={handleInstall}
          aria-expanded={showInstructions}
          aria-controls="app-download-instructions"
        >
          {installPrompt ? "Install Elevoni" : "How to install"}
        </button>
      )}

      {showInstructions && !installed && (
        <div
          className="app-download-instructions"
          id="app-download-instructions"
        >
          {appleMobile ? (
            <p>
              On your iPhone or iPad, open this page in Safari,
              tap the Share button, then choose{" "}
              <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p>
              Open your browser menu and look for{" "}
              <strong>Install app</strong> or{" "}
              <strong>Add to Home screen</strong>. On desktop,
              the install option may appear in the address bar
              or browser menu.
            </p>
          )}

          <p>
            If you do not see an install option, update your
            browser and make sure you are visiting the secure
            Elevoni website.
          </p>
        </div>
      )}
    </section>
  );
};

export default AppDownload;
