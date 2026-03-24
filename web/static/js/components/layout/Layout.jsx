/* Layout Components - SiteHeader, NavOverlay, PageTransition */

function SiteHeader({ route, onBack }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(function () {
    const onScroll = function () {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return function () {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  React.useEffect(
    function () {
      setMenuOpen(false);
    },
    [route],
  );

  return (
    <React.Fragment>
      <header className={"site-header" + (scrolled ? " scrolled" : "")}>
        <a
          className="site-logo"
          href="#/"
          onClick={function (e) {
            if (onBack) {
              e.preventDefault();
              onBack();
            }
          }}
        >
          xAssassin.
        </a>
        <button
          className={"menu-toggle" + (menuOpen ? " active" : "")}
          onClick={function () {
            setMenuOpen(!menuOpen);
          }}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </header>
      <NavOverlay
        open={menuOpen}
        route={route}
        onClose={function () {
          setMenuOpen(false);
        }}
      />
    </React.Fragment>
  );
}

function NavOverlay({ open, route, onClose }) {
  return (
    <div className={"nav-overlay" + (open ? " open" : "")}>
      <nav className="nav-overlay-inner">
        {NAV_ITEMS.map(function (item, i) {
          return (
            <a
              key={item.path}
              className={
                "nav-overlay-link" + (route === item.path ? " active" : "")
              }
              href={"#" + item.path}
              onClick={onClose}
              style={{ transitionDelay: open ? i * 0.06 + "s" : "0s" }}
            >
              <span className="nav-link-index">{"0" + (i + 1)}</span>
              <span className="nav-link-text">{item.label}</span>
              {route === item.path && <span className="nav-link-active" />}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

function PageTransition({ children, routeKey }) {
  const ref = React.useRef(null);

  React.useEffect(
    function () {
      if (typeof gsap === "undefined" || !ref.current) return;
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      );
    },
    [routeKey],
  );

  return <div ref={ref}>{children}</div>;
}

// Export to window
window.SiteHeader = SiteHeader;
window.NavOverlay = NavOverlay;
window.PageTransition = PageTransition;
