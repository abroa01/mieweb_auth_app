import React from "react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className="flex justify-center items-center mt-4 w-full">
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className="px-3 py-1 bg-gray-300 dark:bg-gray-600/80 dark:text-gray-400 rounded disabled:bg-gray-400"
      >
        Prev
      </button>
      <span className="px-2 dark:text-gray-300">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="px-3 py-1 bg-gray-300 dark:bg-gray-600/80 dark:text-gray-400 rounded disabled:bg-gray-400"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
