// Where the site starts. A lesson page lives at <root>lessons/<id>/index.html, so the root is whatever comes before "lessons/" in the
// address: "/" on a domain of its own (a Forma space, a custom domain), "/advanced-guitar-theory/" on a GitHub Pages project site.
// Everything the pages load (the lesson script, sounds, fonts, links back to the catalog) is built from this, never from a bare "/".
export const SITE_ROOT: string = (() => {
  const m = /^(.*\/)lessons\/[^/]+\//.exec(window.location.pathname);
  return m ? m[1] : "/";
})();
