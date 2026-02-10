function initNavigation() {
    const links = document.querySelectorAll('.nav__link');
    const views = document.querySelectorAll('.view');

    function showView(viewName) {
        views.forEach(view => {
            view.style.display = view.id === `view-${viewName}` ? 'grid' : 'none';
            // Restore grid layout for .main class
        });

        links.forEach(link => {
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Handle theme toggle visibility: we only have one real one in Home, others utilize the main one via state sync if needed
        // But since we are SPA, one main theme toggle covers the whole app.
        // In the HTML I put placeholders for layout balance in other views.
    }

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            showView(view);
        });
    });

    // Init
    showView('home');
}

// Theme logic
const themeToggle = document.getElementById("themeToggle");
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeToggle) {
        themeToggle.checked = theme === "light";
    }
}

if (themeToggle) {
    const saved = localStorage.getItem("pixelMorphTheme");
    if (saved) {
        applyTheme(saved);
    }
    themeToggle.addEventListener("change", (event) => {
        const next = event.target.checked ? "light" : "dark";
        localStorage.setItem("pixelMorphTheme", next);
        applyTheme(next);
    });
}

document.addEventListener('DOMContentLoaded', initNavigation);
