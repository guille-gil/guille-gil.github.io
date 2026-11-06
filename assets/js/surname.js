/* Make the compound surname visually distinct: Guillermo / Gil de Avalle. */
(function () {
  "use strict";
  var el = document.querySelector(".author__name");
  if (!el || el.querySelector(".surname")) return;
  var m = el.textContent.trim().match(/^(\S+)\s+(.+)$/);
  if (!m) return;
  el.textContent = "";
  var given = document.createElement("span");
  given.className = "given";
  given.textContent = m[1];
  var sur = document.createElement("span");
  sur.className = "surname";
  sur.textContent = m[2].replace(/ /g, " ");
  el.appendChild(given);
  el.appendChild(sur);
})();
