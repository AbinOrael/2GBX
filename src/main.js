import { startParticlePage } from "./particlePage.js";
import { startViewerPage } from "./viewerPage.js";

const app = document.getElementById("app");
const navLinks = document.querySelectorAll("#nav a");

let stopCurrentPage = null;

function updateNav(hash) {

  navLinks.forEach(link => {
    link.classList.remove("active");

    if (link.getAttribute("href") === hash) {
      link.classList.add("active");
    }
  });

}

function showPage() {

  const hash = location.hash || "#/particles";

  if (stopCurrentPage) {
    stopCurrentPage();
    stopCurrentPage = null;
  }

  if (hash === "#/viewer") {

    document.body.dataset.theme = "light";
    stopCurrentPage = startViewerPage(app);

  } else {

    document.body.dataset.theme = "dark";
    stopCurrentPage = startParticlePage(app);

  }

  updateNav(hash);

}

window.addEventListener("hashchange", showPage);

showPage();