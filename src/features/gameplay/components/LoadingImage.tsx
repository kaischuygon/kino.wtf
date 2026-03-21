import { useCallback, useState } from 'react';

interface LoadingImageProps {
  src: string;
  alt: string;
  wrapperClassName?: string;
  imageClassName?: string;
}

export default function LoadingImage({
  src,
  alt,
  wrapperClassName = 'w-full',
  imageClassName = 'w-full h-full object-cover',
}: LoadingImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const setImageRef = useCallback((node: HTMLImageElement | null) => {
    if (!node) return;
    if (node.complete) {
      if (node.naturalWidth > 0) {
        setLoaded(true);
      } else {
        setFailed(true);
      }
    }
  }, []);

  return (
    <div
      className={['relative overflow-hidden bg-base-300', wrapperClassName].join(' ')}
      style={{ aspectRatio: '2 / 3' }}
    >
      {!loaded && !failed && <div className="skeleton absolute inset-0" />}
      {failed && <div className="skeleton absolute inset-0 opacity-60" />}
      <img
        ref={setImageRef}
        src={src}
        alt={alt}
        className={[
          'absolute inset-0 transition-opacity duration-200',
          imageClassName,
          loaded ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
}
