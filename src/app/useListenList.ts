import { useEffect, useRef, useState } from 'react';
import {
  addListenItem,
  deleteListenItem,
  listListenItems,
  type ListenItem,
} from '../api/listen-list.js';

// The account's listen list for one project. `loaded` is false until the
// initial GET has settled; the caller disables add/remove until then, so no
// mutation is ever in flight while that fetch is (see the effect below). Both
// add and remove wait for the server before changing `items` at all, and the
// caller only starts one at a time (see ListenListPanel), so this list is
// always either the last confirmed snapshot or mid-request -- never a state
// that itself needs to be reconciled against a later fetch or rolled back.
export function useListenList(
  projectSlug: string | null,
  onError: (message: string) => void
) {
  const [items, setItems] = useState<ListenItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Identifies which visit to a project (not which project) is current. A
  // plain "is this still the active slug" string check cannot tell two visits
  // to the *same* slug apart: leaving A for B and back to A resets the effect
  // (a fresh load), but a request begun on the first visit to A that resolves
  // during the second would still pass an active-slug check, since the string
  // is identical, and could apply a now-stale result to the second visit's
  // state. Bumped once per effect run (every project change, including back
  // to one already visited); add/remove capture it at their own start and
  // compare later, so anything from a prior visit is recognized as such no
  // matter which slug it happened to be for.
  const generation = useRef(0);

  // Shared by the initial load and a manual retry: a failed GET otherwise
  // leaves `loaded` false forever, with add/remove disabled and nothing left
  // to move it forward.
  function load(slug: string) {
    const myGeneration = ++generation.current;
    listListenItems(slug)
      .then(list => {
        if (generation.current === myGeneration) {
          setItems(list);
          setLoaded(true);
        }
      })
      .catch(e => {
        if (generation.current === myGeneration) {
          onError(e instanceof Error ? e.message : String(e));
        }
      });
  }

  useEffect(() => {
    generation.current++; // invalidates anything still in flight from before
    setItems([]);
    setLoaded(false);
    if (projectSlug) load(projectSlug);
    // onError is a stable state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectSlug]);

  function retry() {
    if (projectSlug) load(projectSlug);
  }

  // Resolves to the existing entry when the server says the text already
  // matched one (so the caller can say when it was added), or null for a
  // genuinely new entry. Rejects when the server refuses the entry outright;
  // the caller (ListenListPanel) is what keeps the typed text around for a
  // retry in that case, since this hook never touches it.
  async function add(text: string): Promise<ListenItem | null> {
    if (!projectSlug) return null;
    const slug = projectSlug;
    const myGeneration = generation.current;
    const { duplicate, ...item } = await addListenItem(slug, text);
    if (generation.current !== myGeneration) return duplicate ? item : null;
    if (!duplicate) {
      setItems(previous => [...previous, item]);
    }
    return duplicate ? item : null;
  }

  async function remove(id: string): Promise<void> {
    if (!projectSlug) return;
    const slug = projectSlug;
    const myGeneration = generation.current;
    try {
      await deleteListenItem(slug, id);
    } catch (e) {
      if (generation.current === myGeneration) {
        onError(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (generation.current === myGeneration) {
      setItems(previous => previous.filter(item => item.id !== id));
    }
  }

  // The server removes an item when a session starts from it; this only keeps
  // the local list in step with a deletion that has already happened.
  function forget(id: string) {
    setItems(previous => previous.filter(item => item.id !== id));
  }

  return { items, loaded, add, remove, forget, retry };
}
