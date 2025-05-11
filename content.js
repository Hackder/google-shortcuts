/**
 * @returns {Promise<HTMLDivElement | null>}
 */
async function waitForSearchElement() {
  const { promise, resolve } = Promise.withResolvers();

  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLDivElement)) {
          continue;
        }

        if (node.id === "search") {
          observer.disconnect();
          resolve(node);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const alreadyExists = document.getElementById("search");
  if (alreadyExists) {
    observer.disconnect();

    if (alreadyExists instanceof HTMLDivElement) {
      resolve(alreadyExists);
    } else {
      console.error("Expected search element to be a div");
      resolve(null);
    }
  }

  return promise;
}

/**
 * State of the extension
 * @typedef {Object} State
 * @property {HTMLElement[]} searchResults
 * @property {number} selectedIndex
 */

/**
 * @type {State}
 */
const state = {
  searchResults: [],
  selectedIndex: 0,
};

function highlightSelected() {
  // Scroll into view
  const element = state.searchResults[state.selectedIndex];
  if (element === undefined) {
    console.error("Selected element is undefined");
    return;
  }
  console.log(element);

  const boundingRect = element.getBoundingClientRect();
  if (boundingRect.top < 0 || boundingRect.bottom > window.innerHeight) {
    element?.scrollIntoView({
      block: "center",
    });
  }

  const highlighted = document.querySelectorAll(".gscss-highlight");

  // Do nothing if the selected element is already highlighted
  if (highlighted.length === 1 && highlighted[0] === element) {
    return;
  }

  // Remove all current highlights
  for (const element of highlighted) {
    element.classList.remove("gscss-highlight");
  }

  element.classList.add("gscss-highlight");
}

/**
 * @param {KeyboardEvent} event
 */
function handleKeyDown(event) {
  // Make sure we are not inside an input element
  const activeElementName =
    (document.activeElement && document.activeElement.tagName) ?? "";
  if (activeElementName === "INPUT" || activeElementName === "TEXTAREA") {
    return;
  }

  switch (event.key) {
    case "j":
    case "ArrowDown": {
      event.preventDefault();
      state.selectedIndex =
        (state.selectedIndex + 1) % state.searchResults.length;
      highlightSelected();
      break;
    }
    case "k":
    case "ArrowUp": {
      event.preventDefault();
      state.selectedIndex =
        (state.selectedIndex - 1 + state.searchResults.length) %
        state.searchResults.length;
      highlightSelected();
      break;
    }
    case " ":
    case "Enter": {
      event.preventDefault();
      const element = state.searchResults[state.selectedIndex];
      if (element === undefined) {
        console.error("Selected element is undefined");
        return;
      }

      const link = element.querySelector("a");
      if (link === null) {
        console.error("Link not found");
        return;
      }

      // if the meta key is pressed, open the link in a new tab
      if (event.metaKey) {
        window.open(link.href, "_blank");
        break;
      }

      window.location.href = link.href;
      break;
    }
  }
}

/**
 * @param {HTMLDivElement} searchElement
 * @returns {HTMLElement[]}
 */
function extractSearchResults(searchElement) {
  const headings = searchElement.querySelectorAll("h3");

  const results = [];

  for (const heading of headings) {
    /**
     * @type {HTMLElement}
     */
    let highestParent = heading;

    while (highestParent.getAttribute("lang") === null) {
      if (highestParent.parentElement === null) {
        console.error("Parent element is null");
        break;
      }

      highestParent = highestParent.parentElement;
    }

    if (highestParent.tagName !== "DIV") {
      continue;
    }

    results.push(highestParent);
  }

  return results;
}

/**
 * @param {HTMLDivElement} searchElement
 * @param {MutationRecord[]} mutationList
 * @param {MutationObserver} observer
 */
function handleSearchResultsChanged(searchElement, mutationList, observer) {
  const searchResults = extractSearchResults(searchElement);

  state.searchResults = searchResults;
  highlightSelected();
}

async function main() {
  const searchElement = await waitForSearchElement();
  if (searchElement === null) {
    console.error("Search element not found");
    return;
  }

  document.addEventListener("keydown", handleKeyDown);

  const observer = new MutationObserver((mutationList, observer) =>
    handleSearchResultsChanged(searchElement, mutationList, observer),
  );
  observer.observe(searchElement, {
    subtree: true,
    childList: true,
  });
}

main();
