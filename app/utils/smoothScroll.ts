export function smoothScroll(targetId: string, duration: number) {
  // Get the target element
  const targetElement = document.getElementById(targetId);
  if (!targetElement) return;

  // Get the current scroll position
  const startPosition = window.pageYOffset;
  // Get the target position
  const targetPosition = targetElement.getBoundingClientRect().top + startPosition;
  // Calculate distance to scroll
  const distance = targetPosition - startPosition;
  // Track the start time
  let startTime: number | null = null;

  function animation(currentTime: number) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const scrollY = easeInOutCubic(timeElapsed, startPosition, distance, duration);
    window.scrollTo(0, scrollY);

    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  }

  // Easing function for smooth acceleration and deceleration
  function easeInOutCubic(t: number, b: number, c: number, d: number) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t + b;
    t -= 2;
    return c / 2 * (t * t * t + 2) + b;
  }

  requestAnimationFrame(animation);
}