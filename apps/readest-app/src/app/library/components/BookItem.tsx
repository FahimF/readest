import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { MdCheckCircle, MdCheckCircleOutline } from 'react-icons/md';
import {
  LiaCloudUploadAltSolid,
  LiaCloudDownloadAltSolid,
  LiaInfoCircleSolid,
} from 'react-icons/lia';

import { Book } from '@/types/book';
import { BookDoc } from '@/libs/document';
import { useEnv } from '@/context/EnvContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';
import { useSettingsStore } from '@/store/settingsStore';
import { LibraryViewModeType } from '@/types/settings';
import { navigateToLogin } from '@/utils/nav';
import { formatAuthors, formatSeries } from '@/utils/book';
import ReadingProgress from './ReadingProgress';
import BookCover from '@/components/BookCover';
import Spinner from '@/components/Spinner';

interface BookItemProps {
  mode: LibraryViewModeType;
  book: Book;
  isSelectMode: boolean;
  selectedBooks: string[];
  transferProgress: number | null;
  handleBookUpload: (book: Book) => void;
  handleBookDownload: (book: Book) => void;
  showBookDetailsModal: (book: Book) => void;
}

const BookItem: React.FC<BookItemProps> = ({
  mode,
  book,
  isSelectMode,
  selectedBooks,
  transferProgress,
  handleBookUpload,
  handleBookDownload,
  showBookDetailsModal,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const { appService } = useEnv();
  const iconSize15 = useResponsiveSize(15);
  const { envConfig } = useEnv();
  const { settings } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [bookMeta, setBookMeta] = useState<BookDoc['metadata'] | null>(null);

  useEffect(() => {
    const loadingTimeout = setTimeout(() => setLoading(true), 300);
    const fetchBookDetails = async () => {
      const appService = await envConfig.getAppService();
      try {
        const details = await appService.fetchBookDetails(book, settings);
        setBookMeta(details);
      } finally {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };
    fetchBookDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  const stopEvent = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!bookMeta)
    return (
      loading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <Spinner loading />
        </div>
      )
    );

  return (
    <div
      className={clsx(
        'book-item flex',
        mode === 'grid' && 'h-full flex-col',
        mode === 'list' && 'h-28 flex-row gap-4 overflow-hidden',
        appService?.hasContextMenu ? 'cursor-pointer' : '',
      )}
    >
      <div
        className={clsx(
          'bg-base-100 relative flex aspect-[28/41] items-center justify-center overflow-hidden shadow-md',
          mode === 'list' && 'min-w-20',
        )}
      >
        <BookCover mode={mode} book={book} />
        {selectedBooks.includes(book.hash) && (
          <div className='absolute inset-0 bg-black opacity-30 transition-opacity duration-300'></div>
        )}
        {isSelectMode && (
          <div className='absolute bottom-1 right-1'>
            {selectedBooks.includes(book.hash) ? (
              <MdCheckCircle className='fill-blue-500' />
            ) : (
              <MdCheckCircleOutline className='fill-gray-300 drop-shadow-sm' />
            )}
          </div>
        )}
      </div>
      <div
        className={clsx(
          'flex w-full flex-col p-0',
          mode === 'grid' && 'pt-2',
          mode === 'list' && 'py-2',
        )}
      >
        <div className={clsx('min-w-0 flex-1', mode === 'list' && 'flex flex-col gap-2')}>
          <h4
            className={clsx(
              'overflow-hidden text-ellipsis font-semibold',
              mode === 'grid' && 'block whitespace-nowrap text-[0.6em] text-xs',
              mode === 'list' && 'line-clamp-2 text-base',
            )}
          >
            {book.title}
          </h4>
          {mode === 'list' && (
            <p className='text-neutral-content line-clamp-1 text-sm'>
              {formatAuthors(book.author, book.primaryLanguage) || ''}
            </p>
          )}
          {mode === 'list' && (
            <p className='text-neutral-content line-clamp-1 text-sm'>
                {formatSeries(bookMeta.belongsTo)}
            </p>
            )}
        </div>
        <div
          className={clsx('flex items-center', book.progress ? 'justify-between' : 'justify-end')}
        >
          {book.progress && <ReadingProgress book={book} />}
          <div className='flex items-center justify-center gap-x-2'>
            {!appService?.isMobile && (
              <button
                className='show-detail-button -m-2 p-2 sm:opacity-0 sm:group-hover:opacity-100'
                onPointerDown={(e) => stopEvent(e)}
                onPointerUp={(e) => stopEvent(e)}
                onPointerMove={(e) => stopEvent(e)}
                onPointerCancel={(e) => stopEvent(e)}
                onPointerLeave={(e) => stopEvent(e)}
                onClick={() => showBookDetailsModal(book)}
              >
                <div className='pt-[1px]'>
                  <LiaInfoCircleSolid size={iconSize15} />
                </div>
              </button>
            )}
            {transferProgress !== null ? (
              transferProgress === 100 ? null : (
                <div
                  className='radial-progress'
                  style={
                    {
                      '--value': transferProgress,
                      '--size': `${iconSize15}px`,
                      '--thickness': '2px',
                    } as React.CSSProperties
                  }
                  role='progressbar'
                ></div>
              )
            ) : (
              (!book.uploadedAt || (book.uploadedAt && !book.downloadedAt)) && (
                <button
                  className='show-cloud-button -m-2 p-2'
                  onPointerDown={(e) => stopEvent(e)}
                  onPointerUp={(e) => stopEvent(e)}
                  onPointerMove={(e) => stopEvent(e)}
                  onPointerCancel={(e) => stopEvent(e)}
                  onPointerLeave={(e) => stopEvent(e)}
                  onClick={() => {
                    if (!user) {
                      navigateToLogin(router);
                      return;
                    }
                    if (!book.uploadedAt) {
                      handleBookUpload(book);
                    } else if (!book.downloadedAt) {
                      handleBookDownload(book);
                    }
                  }}
                >
                  {!book.uploadedAt && <LiaCloudUploadAltSolid size={iconSize15} />}
                  {book.uploadedAt && !book.downloadedAt && (
                    <LiaCloudDownloadAltSolid size={iconSize15} />
                  )}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookItem;
