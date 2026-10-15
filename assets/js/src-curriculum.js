/**
 * SRC Curriculum page (src-curriculum.html):
 * search, course filters, expand/collapse all, and table-of-contents navigation.
 */
(function() {
  "use strict";

  const areaCollapses = Array.from(document.querySelectorAll('.area-collapse'));
  const objectives = Array.from(document.querySelectorAll('.objective'));
  const searchInput = document.getElementById('objective-search');
  const chips = Array.from(document.querySelectorAll('.filter-chip'));
  const countEl = document.getElementById('filter-count');
  const clearBtn = document.getElementById('clear-filters');
  const noResults = document.getElementById('no-results');
  const total = objectives.length;

  if (!areaCollapses.length || typeof bootstrap === 'undefined') return;

  const collapseFor = el => bootstrap.Collapse.getOrCreateInstance(el, { toggle: false });

  // Pre-compute lowercase search text for each objective
  objectives.forEach(obj => {
    obj.dataset.search = obj.textContent.replace(/\s+/g, ' ').toLowerCase();
  });

  /**
   * Expand / collapse all
   */
  document.getElementById('expand-all').addEventListener('click', () => {
    areaCollapses.forEach(el => {
      if (!el.closest('.area').hidden) collapseFor(el).show();
    });
  });
  document.getElementById('collapse-all').addEventListener('click', () => {
    areaCollapses.forEach(el => collapseFor(el).hide());
  });

  /**
   * Filtering: within a group (level / subject) chips are OR-ed; across groups AND-ed.
   * A course entry has to satisfy both groups for its objective to match.
   */
  function selected(group) {
    return chips.filter(c => c.dataset.filter === group && c.getAttribute('aria-pressed') === 'true')
      .map(c => c.dataset.value);
  }

  function courseMatches(course, levels, subjects) {
    const courseLevels = course.dataset.level.split(' ');
    const courseSubjects = course.dataset.subject.split(' ');
    const levelOk = !levels.length || levels.some(l => courseLevels.includes(l));
    const subjectOk = !subjects.length || subjects.some(s => courseSubjects.includes(s));
    return levelOk && subjectOk;
  }

  function applyFilters() {
    const levels = selected('level');
    const subjects = selected('subject');
    const terms = searchInput.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const courseFilterActive = levels.length > 0 || subjects.length > 0;
    const active = courseFilterActive || terms.length > 0;
    let shown = 0;

    objectives.forEach(obj => {
      let courseOk = true;
      obj.querySelectorAll('.course').forEach(course => {
        course.classList.toggle('is-match', courseFilterActive && courseMatches(course, levels, subjects));
      });
      if (courseFilterActive) courseOk = obj.querySelector('.course.is-match') !== null;
      const textOk = terms.every(t => obj.dataset.search.includes(t));
      obj.hidden = !(courseOk && textOk);
      if (!obj.hidden) shown++;
    });

    document.querySelectorAll('.subsection').forEach(sub => {
      sub.hidden = !sub.querySelector('.objective:not([hidden])');
    });

    document.querySelectorAll('.area').forEach(area => {
      const visible = area.querySelectorAll('.objective:not([hidden])').length;
      const areaCountEl = area.querySelector('.area-count');
      const areaTotal = areaCountEl.dataset.total;
      area.hidden = visible === 0;
      areaCountEl.textContent = active ? `${visible} of ${areaTotal} objectives` : `${areaTotal} objectives`;
      if (active && visible) collapseFor(area.querySelector('.area-collapse')).show();
    });

    // Dim table-of-contents entries with no matching objectives
    document.querySelectorAll('.curriculum-toc li').forEach(li => {
      const target = document.querySelector(li.querySelector('a').getAttribute('href'));
      li.classList.toggle('is-empty', !!target && target.hidden);
    });

    countEl.textContent = active
      ? `Showing ${shown} of ${total} learning objectives`
      : `Showing all ${total} learning objectives`;
    clearBtn.hidden = !active;
    noResults.hidden = shown > 0;
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      applyFilters();
    });
  });

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 150);
  });

  clearBtn.addEventListener('click', () => {
    chips.forEach(c => c.setAttribute('aria-pressed', 'false'));
    searchInput.value = '';
    applyFilters();
  });

  /**
   * In-page links (table of contents, objective IDs, URL hash):
   * open the containing topic area, then scroll to the target.
   */
  function reveal(id, updateHash) {
    const target = document.getElementById(id);
    if (!target || !target.closest('.areas')) return false;
    // A target hidden by the current filters can't be shown, so reset the filters first
    if (target.hidden || target.closest('[hidden]')) clearBtn.click();
    const collapseEl = target.classList.contains('area')
      ? target.querySelector('.area-collapse')
      : target.closest('.area-collapse');
    const scroll = () => target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (collapseEl && !collapseEl.classList.contains('show')) {
      collapseEl.addEventListener('shown.bs.collapse', scroll, { once: true });
      collapseFor(collapseEl).show();
    } else {
      scroll();
    }
    if (updateHash) history.replaceState(null, '', '#' + id);
    return true;
  }

  document.querySelectorAll('.curriculum-toc a[href^="#"], .objective-ref').forEach(link => {
    link.addEventListener('click', e => {
      if (reveal(link.getAttribute('href').slice(1), true)) e.preventDefault();
    });
  });

  const revealHash = () => {
    if (location.hash.length > 1) reveal(decodeURIComponent(location.hash.slice(1)), false);
  };
  window.addEventListener('load', revealHash);
  window.addEventListener('hashchange', revealHash);

  /**
   * Highlight the topic area currently in view in the table of contents
   */
  const tocLinks = Array.from(document.querySelectorAll('.curriculum-toc > ul > li > a'));
  if ('IntersectionObserver' in window && tocLinks.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
      });
    }, { rootMargin: '-120px 0px -60% 0px' });
    document.querySelectorAll('.area').forEach(area => observer.observe(area));
  }

})();
