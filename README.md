# Tài Xỉu | Sảnh Trò Chơi

A Vietnamese-language, just-for-fun Tài Xỉu game built with plain HTML, CSS, and JavaScript. Balances use virtual VND only; there are no real payments or cash value.

## Run locally

The project has no build step or npm dependencies. From the project folder, run the included Node.js static server:

```powershell
node server.js
```

Then open <http://localhost:8000>. Stop the server with `Ctrl+C`. To use another port, set `PORT` first, for example `$env:PORT=8080; node server.js` in PowerShell.

Node.js 18 or newer is recommended. No packages need to be installed. You can also open `index.html` directly, but the local server gives browser storage a normal website origin and behaves more like the deployed site.

## Publish with GitHub Pages

1. Create an empty repository on GitHub. Do not initialize it with a README, license, or `.gitignore`.
2. Configure a commit identity in this folder if Git does not already have one:

	```powershell
	git config user.name "Your Name"
	git config user.email "you@example.com"
	```

3. Initialize, commit, and push the files. Replace the URL with the HTTPS or SSH URL for your GitHub repository:

	```powershell
	git init -b main
	git add index.html styles.css app.js server.js README.md .nojekyll .github/workflows/pages.yml
	git commit -m "Publish Tài Xỉu game"
	git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
	git push -u origin main
	```

4. On GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
5. Open **Actions** and wait for **Deploy to GitHub Pages** to finish. Find the published URL under **Settings → Pages**. It is usually `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

Future pushes to `main` deploy automatically. The workflow can also be started manually from **Actions**.

## Project files

- `index.html` — page structure and Vietnamese interface
- `styles.css` — responsive casino-style layout and animations
- `app.js` — dice game, virtual balance, browser storage, sound, and sample reviews
- `server.js` — dependency-free local static server
- `.github/workflows/pages.yml` — GitHub Pages deployment

Game balance, history, and editable sample-review text are stored in the visitor's browser. They are not account data and do not sync between devices.