/*
 * Article author in the JSON-LD (Resources template).
 * The template's Article schema (page settings) has the Sinpex Organization as author. When the article has an Author
 * (the author box .article-author is filled), that author is replaced by a Person: name, jobTitle, image, url + sameAs
 * (LinkedIn) and worksFor Sinpex. Without an author the schema stays as it is.
 * Runs on the first page load only: Barba does not swap the <head>, and crawlers always load a page directly.
 * No CSS.
 */
let articleAuthorSchemaDone = false;

function initArticleAuthorSchema() {
  if (articleAuthorSchemaDone) return;
  articleAuthorSchemaDone = true;

  const box = document.querySelector(".article-author");
  const nameEl = box && box.querySelector(".article-author_name");
  const name = nameEl && !nameEl.classList.contains("w-dyn-bind-empty") ? nameEl.textContent.trim() : "";
  if (!name) return;

  const script = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).find((s) => /"Article"/.test(s.textContent));
  if (!script) return;

  let data;
  try {
    data = JSON.parse(script.textContent);
  } catch (e) {
    return;
  }

  const roleEl = box.querySelector(".article-author_role-text");
  const img = box.querySelector(".article-author_img");
  const link = box.querySelector(".article-author_link");
  const person = { "@type": "Person", name: name };
  const role = roleEl ? roleEl.textContent.trim() : "";
  if (role) person.jobTitle = role;
  if (img && img.currentSrc) person.image = img.currentSrc;
  else if (img && img.getAttribute("src")) person.image = img.src;
  if (link && /^https?:\/\//.test(link.href)) {
    person.url = link.href;
    person.sameAs = [link.href];
  }
  person.worksFor = { "@type": "Organization", "@id": "https://www.sinpex.ai/#organization", name: "Sinpex", url: "https://www.sinpex.ai" };

  data.author = person;
  script.textContent = JSON.stringify(data);
}
