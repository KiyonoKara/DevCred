import { useMemo, useState } from 'react';

type PaginationItem = number | 'ELLIPSIS';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageWindow?: number;
}

const MAX_VISIBLE_PAGES = 8;

const buildPaginationRange = (
  currentPage: number,
  totalPages: number,
  pageWindow: number,
): PaginationItem[] => {
  if (totalPages <= pageWindow) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const range: PaginationItem[] = [];
  const windowHalf = Math.floor(pageWindow / 2);

  const clampedCurrent = Math.min(Math.max(currentPage, 1), totalPages);
  let start = clampedCurrent - windowHalf;
  let end = clampedCurrent + windowHalf;

  if (start < 2) {
    end += 2 - start;
    start = 2;
  }

  if (end > totalPages - 1) {
    start -= end - (totalPages - 1);
    end = totalPages - 1;
  }

  start = Math.max(start, 2);

  range.push(1);
  if (start > 2) {
    range.push('ELLIPSIS');
  }

  for (let page = start; page <= end; page += 1) {
    range.push(page);
  }

  if (end < totalPages - 1) {
    range.push('ELLIPSIS');
  }

  range.push(totalPages);

  return range;
};

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  pageWindow = MAX_VISIBLE_PAGES,
}: PaginationControlsProps) => {
  const [directPageInput, setDirectPageInput] = useState('');

  const paginationItems = useMemo(
    () => buildPaginationRange(currentPage, totalPages, pageWindow),
    [currentPage, totalPages, pageWindow],
  );

  const goToPage = (page: number) => {
    const safePage = Math.min(Math.max(page, 1), totalPages);
    onPageChange(safePage);
  };

  const handleDirectPageSubmit = () => {
    const parsed = parseInt(directPageInput, 10);
    if (!Number.isNaN(parsed)) {
      goToPage(parsed);
    }
    setDirectPageInput('');
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className='pagination-container'>
      <div className='pagination-controls'>
        <button
          className='pagination-button'
          type='button'
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}>
          Previous
        </button>
        {totalPages > MAX_VISIBLE_PAGES && (
          <button
            type='button'
            className='pagination-button'
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}>
            Start
          </button>
        )}
        <div className='pagination-pages'>
          {paginationItems.map((item, idx) =>
            item === 'ELLIPSIS' ? (
              <span key={`ellipsis-${idx}`} className='pagination-ellipsis'>
                …
              </span>
            ) : (
              <button
                key={item}
                type='button'
                className={`pagination-page-button ${item === currentPage ? 'active' : ''}`}
                onClick={() => goToPage(item)}>
                {item}
              </button>
            ),
          )}
        </div>
        {totalPages > MAX_VISIBLE_PAGES && (
          <button
            type='button'
            className='pagination-button'
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}>
            End
          </button>
        )}
        <button
          className='pagination-button'
          type='button'
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
      {totalPages > MAX_VISIBLE_PAGES && (
        <div className='pagination-direct-input'>
          <label htmlFor='pagination-input'>
            Jump to page:
            <input
              id='pagination-input'
              type='number'
              min={1}
              max={totalPages}
              value={directPageInput}
              onChange={event => setDirectPageInput(event.target.value)}
            />
          </label>
          <button type='button' onClick={handleDirectPageSubmit}>
            Go
          </button>
        </div>
      )}
    </div>
  );
};

export default PaginationControls;

