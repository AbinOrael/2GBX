import { startParticlePage } from "./particlePage.js";
import { startViewerPage } from "./viewerPage.js";
import { startAvatarPage } from "./avatarPage.js";
import { startArcadePage } from "./arcadePage.js";

const app = document.getElementById("app");
const navLinks = document.querySelectorAll("#nav a");

let stopCurrentPage = null;

function updateNav(hash) {
  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === hash) {
      link.classList.add("active");
    }
  });
}

function showPage() {
  const hash = location.hash || "#/particles";

  if (!app) {
    console.error("Missing #app container in index.html");
    return;
  }

  if (stopCurrentPage) {
    stopCurrentPage();
    stopCurrentPage = null;
  }

  try {
    if (hash === "#/viewer") {
      document.body.dataset.theme = "light";
      stopCurrentPage = startViewerPage(app);
    } else if (hash === "#/avatar") {
      document.body.dataset.theme = "light";
      stopCurrentPage = startAvatarPage(app);
    } else if (hash === "#/arcade") {
      document.body.dataset.theme = "light";
      stopCurrentPage = startArcadePage(app);
    } else {
      document.body.dataset.theme = "dark";
      stopCurrentPage = startParticlePage(app);
    }
  } catch (err) {
    console.error("Page startup failed:", err);
  }

  updateNav(hash);
}

window.addEventListener("hashchange", showPage);
showPage();