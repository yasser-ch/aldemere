Conquest of Aldemere: project site
==================================

A plain static site, bound as one old book: HTML, two CSS files, two small JS files and compressed images. No game code and no source files are in this folder.

Publish on GitHub Pages (free)
1. Create a new repository (for example "aldemere"). Make it a separate repo from the game.
2. Put the contents of this folder at the repository root and push to main.
3. Settings > Pages > Deploy from a branch > main > / (root).
4. The site appears at https://<your-username>.github.io/aldemere/

Connect the forms
- Both forms need an endpoint. Create a free form at Formspree or Web3Forms, copy its URL and paste it into
  formEndpoint at the top of js/site.js. Until then the forms tell visitors to write by email.
- The contact address is set in js/site.js (mailUser and mailHost).

Add a news post
- Copy any file in devlog/ (for example welcome-to-aldemere.html), change the title, date and text, and add a card
  for it in devlog/index.html and in the "Latest news" strip of index.html.

Change a screenshot or foe
- Images live in img/. Keep scenes about 900 px wide and foes about 330 px high, saved as .webp, so the page stays light.


How the book works (new)
- index.html holds every page as a <section class="page" data-id="...">, in reading order. js/book.js binds them into
  sheets that turn (two pages per sheet, so the page count must stay EVEN; add or remove pages in pairs, or add a
  blank page). Page 0 is the cover and the last page is the inside back cover. Without script the pages simply stack.
- Spreads are (1,2) (3,4) (5,6)... so a chapter that starts on an odd page opens on the left. The contents page
  (data-go links) and the ribbons (RIBBONS at the top of js/book.js) point at data-id values, not numbers, but the page
  numbers printed in the contents list are typed by hand: update them if pages move.
- Foes: each plate in the Bestiary pages carries data-name, data-tier, data-hp and data-lore. Heroes and class stats are
  in the #hero-data block and the CLASSES table in js/book.js. These mirror the game; update them when the game changes.
- News: the Chronicle page lists the three newest posts. Add the post to devlog/ as before, then add an <li> there and in
  devlog/index.html.
- Sound is two real page-flip recordings used in turn (audio/flip-1.mp3, flip-2.mp3), on by default (the visitor can switch it off under the book).

The cast and the desk
- The cast chapter (pages 13 and 14) is generated from the CAST_A and CAST_B lists in the build script. Names, roles and bios are the game's own, so keep them spoiler-free. Clicking a portrait opens the #castbox dialog.
- The desk behind the book is img/dungeon-wide.webp (computers) and img/dungeon-tall.webp (phones, chosen by a media query in css/book.css). The dust and the torch flicker are added by js/book.js and switch off for people who prefer reduced motion.
