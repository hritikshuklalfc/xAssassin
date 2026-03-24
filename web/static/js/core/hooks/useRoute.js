/* Hash-based Routing Hook */
function useRoute() {
  const [route, setRoute] = React.useState(
    window.location.hash.slice(1) || "/",
  );
  React.useEffect(() => {
    const h = () => setRoute(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return route;
}

window.useRoute = useRoute;
