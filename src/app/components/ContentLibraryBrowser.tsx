import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BookOpen, Heart } from 'lucide-react';
import { getContentLibrary, saveContent, ContentItem } from '@/lib/community-content-service';
import { useAuthStore } from '@/app/AppContext';

interface ContentLibraryBrowserProps {
  babyAge?: number;
  babyAgeGroup?: string;
}

export function ContentLibraryBrowser({ babyAge, babyAgeGroup }: ContentLibraryBrowserProps) {
  const { user } = useAuthStore();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [savedContent, setSavedContent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    const contentList = await getContentLibrary(babyAgeGroup ? [babyAgeGroup] : undefined);
    setContent(contentList);
    setFilteredContent(contentList);
    setLoading(false);
  };

  useEffect(() => {
    let filtered = content;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((c) => c.category === selectedCategory);
    }

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredContent(filtered);
  }, [searchTerm, selectedCategory, content]);

  const handleSaveContent = async (contentId: string) => {
    if (!user?.id) {
      setSavedContent((prev) => (prev.includes(contentId) ? prev : [...prev, contentId]));
      return;
    }

    const success = await saveContent(user.id, contentId);
    if (success) {
      setSavedContent((prev) => (prev.includes(contentId) ? prev : [...prev, contentId]));
    }
  };

  const categories = ['all', 'nutrition', 'sleep', 'development', 'health', 'activities', 'safety'];

  if (loading) {
    return <div className="text-center py-8">Loading content library...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Parenting Content Library
        </CardTitle>
        <CardDescription>Expert tips and guides for your baby's age</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="space-y-3">
          <Input
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="nutrition" className="text-xs">
                🥕 Nutrition
              </TabsTrigger>
              <TabsTrigger value="sleep" className="text-xs">
                😴 Sleep
              </TabsTrigger>
              <TabsTrigger value="development" className="text-xs">
                📈 Dev
              </TabsTrigger>
              <TabsTrigger value="health" className="text-xs">
                💊 Health
              </TabsTrigger>
              <TabsTrigger value="activities" className="text-xs">
                🎨 Activities
              </TabsTrigger>
              <TabsTrigger value="safety" className="text-xs">
                🛡️ Safety
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredContent.length === 0 ? (
            <p className="col-span-full text-sm text-gray-500 text-center py-8">No content found</p>
          ) : (
            filteredContent.map((item) => (
              <Card key={item.id} className="border">
                <CardContent className="pt-3 space-y-2">
                  <div>
                    <div className="font-semibold text-sm">{item.title}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                      {item.category}
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {item.source && (
                    <div className="text-xs text-blue-600 dark:text-blue-400">By {item.source}</div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {item.content_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="flex-1 text-xs h-8"
                      >
                        <a href={item.content_url} target="_blank" rel="noopener noreferrer">
                          <BookOpen className="h-3 w-3 mr-1" />
                          Read
                        </a>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant={savedContent.includes(item.id) ? 'default' : 'outline'}
                      onClick={() => handleSaveContent(item.id)}
                      disabled={savedContent.includes(item.id)}
                      className="text-xs h-8"
                    >
                      <Heart
                        className={`h-3 w-3 ${
                          savedContent.includes(item.id) ? 'fill-current' : ''
                        }`}
                      />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="text-xs text-gray-500 text-center pt-2">
          Showing {filteredContent.length} of {content.length} articles
        </div>
      </CardContent>
    </Card>
  );
}
