import React, { useState, useEffect } from 'react';
import { ChevronLeft, Camera, Image as ImageIcon, Share2, Plus } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';
import { addMemoryLog } from '../../lib/supabase-storage';
import { getBabyPhotos, uploadBabyPhoto } from '../../lib/photo-management-service';
import { captureNativePhoto, chooseNativePhoto, isNativeAppRuntime } from '../../lib/native-media';

const MotionDiv = motion.div as any;

interface MonthlyPhotosProps {
  onBack: () => void;
}

export const MonthlyPhotos: React.FC<MonthlyPhotosProps> = ({ onBack }) => {
  const { currentBaby, memories } = useAppContext();
  const [photoGrid, setPhotoGrid] = useState<Record<number, string | null>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [pendingMonth, setPendingMonth] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const supportsNativeCamera = isNativeAppRuntime();

  useEffect(() => {
    // Attempt to map existing memories with photos to months
    if (!currentBaby) return;
    const dob = new Date(currentBaby.dateOfBirth).getTime();
    
    const newGrid: Record<number, string | null> = {};
    for (let i = 1; i <= 12; i++) newGrid[i] = null;

    memories.filter(m => m.photoUrl).forEach(m => {
      const memDate = new Date(m.timestamp).getTime();
      const monthAge = Math.floor((memDate - dob) / (1000 * 60 * 60 * 24 * 30.44));
      if (monthAge >= 1 && monthAge <= 12 && !newGrid[monthAge]) {
        newGrid[monthAge] = m.photoUrl!;
      }
    });

    setPhotoGrid(newGrid);
  }, [currentBaby, memories]);

  useEffect(() => {
    if (!currentBaby) return;

    const loadCloudPhotos = async () => {
      try {
        const photos = await getBabyPhotos(currentBaby.id, 200, 0);
        if (!photos.length) return;

        const dob = new Date(currentBaby.dateOfBirth).getTime();
        setPhotoGrid((prev) => {
          const next = { ...prev };
          for (const photo of photos) {
            const photoDate = new Date(photo.photo_date).getTime();
            const monthAge = Math.floor((photoDate - dob) / (1000 * 60 * 60 * 24 * 30.44));
            if (monthAge >= 1 && monthAge <= 12 && !next[monthAge]) {
              next[monthAge] = photo.url;
            }
          }
          return next;
        });
      } catch (error) {
        console.error('Failed to load cloud monthly photos:', error);
      }
    };

    loadCloudPhotos();
  }, [currentBaby]);

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/#app`;
      if (navigator.share) {
        await navigator.share({
          title: `${currentBaby?.name}'s First Year`,
          text: `Check out ${currentBaby?.name}'s growth over the first 12 months!`,
          url: shareUrl,
        });
      } else {
        alert('Sharing not supported on this browser/device.');
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const uploadMonthPhoto = async (file: File | null | undefined, month: number | null) => {
    if (!file || !currentBaby || !month) {
      setPendingMonth(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }

    setIsUploading(true);
    try {
      const dateForMonth = new Date(currentBaby.dateOfBirth);
      dateForMonth.setMonth(dateForMonth.getMonth() + Math.max(0, month - 1));
      const timestamp = dateForMonth.toISOString();

      let imageUrl: string | null = null;

      const uploadedPhoto = await uploadBabyPhoto(
        currentBaby.id,
        file,
        timestamp,
        `Month ${month} milestone`,
        ['monthly', `month-${month}`],
      );

      if (uploadedPhoto?.url) {
        imageUrl = uploadedPhoto.url;
      } else {
        imageUrl = await readFileAsDataUrl(file);
      }

      await addMemoryLog({
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        babyId: currentBaby.id,
        timestamp,
        text: `${currentBaby.name} month ${month} milestone photo`,
        photoUrl: imageUrl,
        isMilestone: true,
        createdAt: new Date().toISOString(),
      });

      setPhotoGrid((prev) => ({ ...prev, [month]: imageUrl }));
    } catch (error) {
      console.error('Failed to upload monthly photo:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setPendingMonth(null);
    }
  };

  const handleSelectMonth = async (month: number) => {
    setPendingMonth(month);

    if (!supportsNativeCamera) {
      fileInputRef.current?.click();
      return;
    }

    const shouldUseCamera = window.confirm(
      `Take a new photo for month ${month}? Press Cancel to choose one from your library instead.`,
    );

    try {
      const asset = shouldUseCamera
        ? await captureNativePhoto(`month-${month}-milestone`)
        : await chooseNativePhoto(`month-${month}-milestone`);
      await uploadMonthPhoto(asset?.file, month);
    } catch (error) {
      console.error('Native month photo selection failed:', error);
      alert('Could not open your camera or photo library.');
      setPendingMonth(null);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const month = pendingMonth;
    event.target.value = '';
    await uploadMonthPhoto(file, month);
  };

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">First Year Photos</span>
        </div>
        <button onClick={handleShare} className="p-2 text-secondary hover:scale-110 active:scale-95 transition-all">
          <Share2 size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-24 px-6 pb-12">
        <div className="max-w-xl mx-auto w-full space-y-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />

          <div className="text-center">
            <h2 className="text-3xl font-headline font-black text-foreground tracking-tight mb-2">
              {currentBaby?.name}'s Growth
            </h2>
            <p className="text-sm font-bold text-text-dim">
              Capture one photo each month to build a beautiful timeline of their first year.
            </p>
            {supportsNativeCamera && (
              <p className="text-[11px] font-bold text-text-light mt-2">
                Tap a month tile to take a fresh photo or choose one from your library.
              </p>
            )}
            {isUploading && (
              <p className="text-xs font-black uppercase tracking-widest text-secondary mt-3">
                Uploading month {pendingMonth}...
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <MotionDiv
                key={month}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: month * 0.05 }}
                className="relative aspect-square rounded-[2rem] overflow-hidden bg-surface shadow-sm border border-border-gray dark:border-zinc-800 group"
              >
                {photoGrid[month] ? (
                  <>
                    <img
                      src={photoGrid[month]!}
                      alt={`Month ${month}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <button
                        onClick={() => handleSelectMonth(month)}
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur text-white flex items-center justify-center hover:bg-white/40 transition-colors"
                        disabled={isUploading}
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => handleSelectMonth(month)}
                    className="w-full h-full flex flex-col items-center justify-center text-text-dim hover:bg-surface-gray dark:hover:bg-zinc-800 transition-colors"
                    disabled={isUploading}
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-border-gray dark:border-zinc-700 flex items-center justify-center mb-3 text-border-gray dark:text-zinc-600">
                      <Plus size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-light">Add Photo</span>
                  </button>
                )}
                
                {/* Month Label Badge */}
                <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/80 backdrop-blur shadow-sm px-3 py-1 rounded-full border border-white/20">
                  <span className="text-[10px] font-black text-foreground uppercase tracking-widest leading-none">
                    Month {month}
                  </span>
                </div>
              </MotionDiv>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
