import { useEffect, useState } from "react";

// Back to Top component
const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Optimized scroll handler to show/hide the button
  const handleScroll = () => {
    const scrollPosition = window.scrollY;
    setIsVisible(scrollPosition > 300); // Show button after scrolling 300px
  };

  // Add scroll event listener on mount, remove on unmount
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true }); // Passive listener for better performance
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to top instantly when the button is clicked
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "instant", // Instant scroll for immediate effect
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`} // Smooth fade effect, scale on hover, disable pointer events when hidden
      style={{
        zIndex: 1000, // Ensure button is above other elements
        background: "linear-gradient(145deg, #2D2D2D, #1A1A1A)", // Dark gray gradient for modern look
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)", // Subtle shadow for depth
      }}
    >
      <img
        src="/assets/icons/back-to-top.svg"
        alt="Back to Top"
        className="w-5 h-5 transition-filter duration-300 hover:brightness-125"
        style={{ filter: "brightness(0) invert(1)" }} // White icon color, brighten on hover
      />
    </button>
  );
};

export default BackToTop;