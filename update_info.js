const fs = require('fs');
const content = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pixel Forge — Info</title>
    <link rel="stylesheet" href="../src/styles.css" />
  </head>
  <body>
    <main class="wrap">
      <aside class="sidebar">
        <div class="brand">
          <h1>Pixel Forge</h1>
          <p>Permutation-driven morph lab.</p>
        </div>
        <nav class="nav">
          <a class="nav__link" href="./index.html">Home</a>
          <a class="nav__link" href="./scribble.html">Scribble</a>
          <a class="nav__link active" href="./info.html">Info</a>
        </nav>
      </aside>

      <section class="main">
        <header class="header">
          <div>
            <h2>How It Works</h2>
            <p>Brightness sorting → permutation mapping → morph animation.</p>
          </div>
          <label class="theme-toggle">
            <input id="themeToggle" type="checkbox" />
            <span>Light Mode</span>
          </label>
        </header>

        <section class="hero">
          <div>
            <h3>Permutation-Only Morphing</h3>
            <p>We rearrange your pixels into the target's structure using brightness ordering. No recoloring. No AI.</p>
          </div>
          <div class="hero__meta">
            <span>Pure Math</span>
            <span>Frontend Only</span>
            <span>Deterministic</span>
          </div>
        </section>

        <section class="cards">
          <article class="card">
            <header class="card__header">
              <h2>Core Rules</h2>
              <p>Pure math</p>
            </header>
            <ul class="info-list">
              <li>No AI or recoloring.</li>
              <li>Brightness = 0.2126R + 0.7152G + 0.0722B.</li>
              <li>Sort source/target, map darkest-to-darkest.</li>
              <li>Animate with linear interpolation.</li>
            </ul>
          </article>

          <article class="card">
            <header class="card__header">
              <h2>Tips</h2>
              <p>Best results</p>
            </header>
            <ul class="info-list">
              <li>Use high-contrast targets.</li>
              <li>Bold shapes read better.</li>
              <li>Try simple inputs first.</li>
            </ul>
          </article>

          <article class="card">
            <header class="card__header">
              <h2>Modes</h2>
              <p>Home + Scribble</p>
            </header>
            <ul class="info-list">
              <li>Home: upload input + target.</li>
              <li>Scribble: draw your own input.</li>
              <li>Debug mode proves permutation.</li>
            </ul>
          </article>
        </section>
      </section>
    </main>

    <footer class="footer">
      <span>Built by Armash</span>
      <a href="https://github.com/armash66" target="_blank" rel="noreferrer">github.com/armash66</a>
    </footer>

    <script type="module">
      const themeToggle = document.getElementById("themeToggle");
      function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        if (themeToggle) {
          themeToggle.checked = theme === "light";
        }
      }
      const saved = localStorage.getItem("pixelMorphTheme");
      if (saved) applyTheme(saved);
      if (themeToggle) {
        themeToggle.addEventListener("change", (event) => {
          const next = event.target.checked ? "light" : "dark";
          localStorage.setItem("pixelMorphTheme", next);
          applyTheme(next);
        });
      }
    </script>
  </body>
</html>
`;
fs.writeFileSync('public/info.html', content, 'utf8');
console.log('Update complete');
