import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Image, Plus, Calendar } from 'lucide-react';
import { BabyPhoto, uploadBabyPhoto, getBabyPhotos, deletePhoto } from '@/lib/photo-management-service';

interface PhotoGalleryProps {
  babyId: string;
  babyName: string;
}

export function PhotoGallery({ babyId, babyName }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<BabyPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [babyId]);

  const loadPhotos = async () => {
    setLoading(true);
    const data = await getBabyPhotos(babyId, 50);
    setPhotos(data);
    setLoading(false);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const today = new Date().toISOString().split('T')[0];
    const photo = await uploadBabyPhoto(
      babyId,
      file,
      today,
      `Photo from ${new Date().toLocaleDateString()}`,
      ['daily']
    );

    if (photo) {
      setPhotos([photo, ...photos]);
    }
    setUploading(false);
  };

  const handleDeletePhoto = async (photoId: string, storageKey: string) => {
    if (!confirm('Delete this photo?')) return;

    const success = await deletePhoto(photoId, storageKey);
    if (success) {
      setPhotos(photos.filter((p) => p.id !== photoId));
    }
  };

  // Group by month
  const photosByMonth = photos.reduce(
    (acc, photo) => {
      const month = photo.photo_date.substring(0, 7);
      if (!acc[month]) acc[month] = [];
      acc[month].push(photo);
      return acc;
    },
    {} as Record<string, BabyPhoto[]>
  );

  const months = Object.keys(photosByMonth).sort().reverse();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {babyName}'s Photos
            </CardTitle>
            <CardDescription>Monthly milestone photos and memories</CardDescription>
          </div>
          <label>
            <Button asChild disabled={uploading}>
              <span>
                <Plus className="mr-2 h-4 w-4" />
                {uploading ? 'Uploading...' : 'Add Photo'}
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading photos...</div>
        ) : photos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No photos yet. Upload your first photo!</div>
        ) : (
          <Tabs defaultValue={months[0]} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(months.length, 6)}, 1fr)` }}>
              {months.map((month) => (
                <TabsTrigger key={month} value={month} className="text-xs">
                  {new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </TabsTrigger>
              ))}
            </TabsList>

            {months.map((month) => (
              <TabsContent key={month} value={month} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {photosByMonth[month].map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square"
                    >
                      <img
                        src={photo.url}
                        alt={photo.description}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePhoto(photo.id, photo.storage_key || '')}
                        >
                          Delete
                        </Button>
                      </div>
                      {photo.is_monthly_milestone && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
                          Monthly
                        </div>
                      )}
                      {photo.age_days && (
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                          {photo.age_days} days
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
