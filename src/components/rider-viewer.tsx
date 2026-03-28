'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  Plane,
  Music,
  Hotel,
  Car,
  Utensils,
  RefreshCw,
  Trash2,
  History,
  Users,
} from 'lucide-react';

interface EquipmentItem {
  name: string;
  quantity: number;
  artist_brings: boolean;
  notes?: string;
}

interface PerformanceRequirements {
  staff?: {
    sound_tech?: boolean;
    sound_tech_notes?: string;
    lighting_tech?: boolean;
    lighting_tech_notes?: string;
  };
  stage?: {
    requirements?: string[];
  };
}

interface MixerRequirement {
  model: string;
  required_features?: string;
  priority: number;
}

interface StageSetup {
  monitors?: Array<{
    type: string;
    quantity: number;
    location: string;
  }>;
  power?: Array<{
    type: string;
    quantity: number;
  }>;
  furniture?: Array<{
    type: string;
    quantity: number;
    dimensions?: string;
  }>;
}

interface BacklineItem {
  model: string;
  quantity: number;
}

interface TechRider {
  equipment: EquipmentItem[];
  stage_setup?: StageSetup;
  backline?: {
    cdjs?: BacklineItem[];
    turntables?: BacklineItem[];
    mixer_minimum_requirements?: string;
  };
  audio: {
    inputs_needed: number;
    monitor_type: string;
    preferred_mixers?: MixerRequirement[];
    special_requirements?: string;
  };
  transport?: {
    flights_needed: boolean;
    priority_boarding: boolean;
    baggage_requirements?: string;
    origin_city?: string;
  };
  technical_notes?: string;
  referenced_images?: string[];
  performance_requirements?: PerformanceRequirements;
}

interface HospitalityRider {
  accommodation?: {
    required: boolean;
    nights: number;
    room_type: string;
    check_in?: string;
    check_out?: string;
    location_preference?: string;
  };
  catering?: {
    meals: string[];
    dietary: string[];
    drinks: {
      alcopops: boolean;
      spirits: string[];
      mixers: string[];
      water: boolean;
    };
    special_requests?: string;
  };
  transport_ground?: {
    car_service: boolean;
    pickup_time?: string;
    pickup_location?: string;
    return_required: boolean;
    vehicle_type?: string;
  };
  hospitality_notes?: string;
}

interface RiderViewerProps {
  artistId: string;
  artistName: string;
  techRider?: TechRider | null;
  hospitalityRider?: HospitalityRider | null;
  eventId?: string;
  onRiderUpdated?: () => void;
}

interface UploadTaskEventSummary {
  event_id: string | null;
  event_name: string;
  event_date: string;
  tasks_created: number;
  task_titles: string[];
}

interface UploadResult {
  success: boolean;
  warnings: string[];
  tasks_created?: number;
  task_events?: UploadTaskEventSummary[];
}

export function RiderViewer({ 
  artistId, 
  artistName, 
  techRider, 
  hospitalityRider,
  eventId,
  onRiderUpdated 
}: RiderViewerProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lmStudioStatus, setLmStudioStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showTaskSummary, setShowTaskSummary] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [riderType, setRiderType] = useState<'tech' | 'hospitality' | 'both'>('both');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check LM Studio status on mount
  useEffect(() => {
    checkLMStudioStatus();
  }, []);

  const checkLMStudioStatus = async () => {
    setLmStudioStatus('checking');
    try {
      const response = await fetch('/api/artists/extract-rider');
      const data = await response.json();
      setLmStudioStatus(data.status === 'connected' ? 'connected' : 'disconnected');
    } catch {
      setLmStudioStatus('disconnected');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleDeleteRider = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/artists/${artistId}/delete-rider`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        onRiderUpdated?.();
      }
    } catch (error) {
      console.error('Failed to delete rider:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('artist_id', artistId);
    formData.append('rider_type', riderType);
    if (eventId) {
      formData.append('event_id', eventId);
    }

    try {
      const response = await fetch('/api/artists/extract-rider', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const result = {
          success: true,
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
          tasks_created: typeof data.tasks_created === 'number' ? data.tasks_created : 0,
          task_events: Array.isArray(data.task_events) ? data.task_events : [],
        };
        setUploadResult(result);
        setSelectedFile(null);
        
        // Show task summary dialog and keep it open
        setShowTaskSummary(true);
        setIsUploadOpen(false);
      } else {
        setUploadResult({ success: false, warnings: [data.error || 'Upload failed'] });
      }
    } catch {
      setUploadResult({ success: false, warnings: ['Upload failed'] });
    } finally {
      setUploading(false);
    }
  };

  const hasTechTransport = Boolean(
    techRider?.transport &&
      (techRider.transport.flights_needed ||
        techRider.transport.priority_boarding ||
        techRider.transport.origin_city ||
        techRider.transport.baggage_requirements)
  );
  const hasStageSetup = Boolean(
    techRider?.stage_setup?.monitors?.length ||
      techRider?.stage_setup?.power?.length ||
      techRider?.stage_setup?.furniture?.length
  );
  const hasMixerRequirements = Boolean(
    techRider?.audio?.preferred_mixers?.length ||
      techRider?.backline?.mixer_minimum_requirements ||
      techRider?.backline?.cdjs?.length ||
      techRider?.backline?.turntables?.length
  );
  const hasHospitality = Boolean(
    hospitalityRider?.accommodation ||
      hospitalityRider?.catering ||
      hospitalityRider?.transport_ground ||
      hospitalityRider?.hospitality_notes
  );
  const hasRiders = Boolean(
    techRider?.equipment?.length ||
      hasTechTransport ||
      hasStageSetup ||
      hasMixerRequirements ||
      techRider?.technical_notes ||
      techRider?.referenced_images?.length ||
      hasHospitality
  );

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-400" />
          Artist Riders
        </CardTitle>
        <div className="flex items-center gap-2">
          {lmStudioStatus === 'connected' ? (
            <Badge className="bg-green-600 text-xs">LM Studio</Badge>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkLMStudioStatus}
              className="border-zinc-700"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Check AI
            </Button>
          )}
          
          {hasRiders && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-900/50 text-red-400 hover:bg-red-950/50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsArchiveOpen(true)}
                className="border-zinc-700"
              >
                <History className="h-3 w-3 mr-1" />
                History
              </Button>
            </>
          )}
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                <Upload className="h-4 w-4 mr-1" />
                Upload PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle>Upload Rider PDF - {artistName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {lmStudioStatus !== 'connected' && (
                  <div className="p-4 bg-yellow-950/50 border border-yellow-700 rounded-lg">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      LM Studio not connected. Upload still works with PDF fallback extraction.
                    </p>
                    <p className="text-zinc-400 text-xs mt-2">
                      Start LM Studio for improved extraction quality (recommended: qwen3.5-2b).
                    </p>
                  </div>
                )}
                
                <div>
                  <Label>Rider Type</Label>
                  <Select value={riderType} onValueChange={(v) => setRiderType(v as typeof riderType)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="both">Both (Technical + Hospitality)</SelectItem>
                      <SelectItem value="tech">Technical Rider Only</SelectItem>
                      <SelectItem value="hospitality">Hospitality Rider Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select PDF File</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>

                {selectedFile && (
                  <div className="p-3 bg-zinc-800 rounded-lg">
                    <p className="text-sm text-white">{selectedFile.name}</p>
                    <p className="text-xs text-zinc-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                )}

                {uploadResult && (
                  <div className={`p-4 rounded-lg ${uploadResult.success ? 'bg-green-950/50 border border-green-700' : 'bg-red-950/50 border border-red-700'}`}>
                    {uploadResult.success ? (
                      <div>
                        <p className="text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Rider extracted successfully!
                        </p>
                        {typeof uploadResult.tasks_created === 'number' && (
                          <p className="text-green-300 text-sm mt-1">
                            Auto-generated tasks: {uploadResult.tasks_created}
                          </p>
                        )}
                        {uploadResult.task_events && uploadResult.task_events.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {uploadResult.task_events.map((event, index) => (
                              <p key={event.event_id || `unscheduled-${index}`} className="text-zinc-300 text-xs">
                                {event.event_name} ({event.event_date}): {event.tasks_created} task(s)
                              </p>
                            ))}
                          </div>
                        )}
                        {uploadResult.warnings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {uploadResult.warnings.map((w, i) => (
                              <p key={i} className="text-yellow-400 text-sm">{w}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-red-400">{uploadResult.warnings[0]}</p>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="w-full bg-violet-600 hover:bg-violet-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      AI Processing (1-5 min)...
                    </>
                  ) : (
                    'Extract Rider Data'
                  )}
                </Button>
                {uploading && (
                  <p className="text-xs text-zinc-500 text-center mt-2">
                    Local AI is processing your PDF. This may take a few minutes.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!hasRiders ? (
          <div className="text-center py-8 text-zinc-500">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No rider data available</p>
            <p className="text-sm">Upload a PDF to extract rider requirements</p>
          </div>
        ) : (
          <Tabs defaultValue="tech" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
              <TabsTrigger value="tech" className="data-[state=active]:bg-violet-600">
                <Music className="h-4 w-4 mr-1" /> Technical
              </TabsTrigger>
              <TabsTrigger value="hospitality" className="data-[state=active]:bg-violet-600">
                <Utensils className="h-4 w-4 mr-1" /> Hospitality
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tech" className="mt-4 space-y-4">
              {/* Transport */}
              {hasTechTransport && techRider?.transport && (
                <div className="p-3 bg-blue-950/30 border border-blue-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-white">Flight Requirements</span>
                    {techRider.transport.priority_boarding && (
                      <Badge className="bg-red-600 text-xs">Priority Boarding</Badge>
                    )}
                  </div>
                  <div className="text-sm text-zinc-400 space-y-1">
                    {(techRider.transport.origin_city || techRider.transport.flights_needed) && (
                      <p>Origin: {techRider.transport.origin_city || 'Unknown'}</p>
                    )}
                    {techRider.transport.baggage_requirements && (
                      <p>Baggage: {techRider.transport.baggage_requirements}</p>
                    )}
                    {!techRider.transport.flights_needed && techRider.transport.priority_boarding && (
                      <p>Priority boarding required for travel booking</p>
                    )}
                  </div>
                </div>
              )}

              {/* Audio */}
              {techRider?.audio && (
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="h-4 w-4 text-violet-400" />
                    <span className="font-medium text-white">Audio Setup</span>
                  </div>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <p>Inputs needed: {techRider.audio.inputs_needed}</p>
                    <p>Monitor type: {techRider.audio.monitor_type}</p>
                    {techRider.audio.special_requirements && (
                      <p className="text-yellow-400">{techRider.audio.special_requirements}</p>
                    )}
                    {techRider.audio.preferred_mixers && techRider.audio.preferred_mixers.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-medium text-zinc-300 mb-1">Preferred Mixers</p>
                        <div className="space-y-1">
                          {techRider.audio.preferred_mixers
                            .slice()
                            .sort((left, right) => left.priority - right.priority)
                            .map((mixer, index) => (
                              <p key={`${mixer.model}-${index}`}>
                                {mixer.priority}. {mixer.model}
                                {mixer.required_features ? ` — ${mixer.required_features}` : ''}
                              </p>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stage Setup */}
              {hasStageSetup && techRider?.stage_setup && (
                <div className="p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Music className="h-4 w-4 text-cyan-400" />
                    <span className="font-medium text-white">Setup Requirements</span>
                  </div>

                  {techRider.stage_setup.monitors && techRider.stage_setup.monitors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-cyan-300 mb-1">Monitors</p>
                      <div className="space-y-1">
                        {techRider.stage_setup.monitors.map((monitor, index) => (
                          <p key={`${monitor.type}-${index}`} className="text-sm text-zinc-300">
                            {monitor.type} x{monitor.quantity} {monitor.location ? `(${monitor.location})` : ''}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {techRider.stage_setup.power && techRider.stage_setup.power.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-cyan-300 mb-1">Power</p>
                      <div className="space-y-1">
                        {techRider.stage_setup.power.map((power, index) => (
                          <p key={`${power.type}-${index}`} className="text-sm text-zinc-300">
                            {power.type} x{power.quantity}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {techRider.stage_setup.furniture && techRider.stage_setup.furniture.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-cyan-300 mb-1">Furniture</p>
                      <div className="space-y-1">
                        {techRider.stage_setup.furniture.map((item, index) => (
                          <p key={`${item.type}-${index}`} className="text-sm text-zinc-300">
                            {item.type} x{item.quantity}
                            {item.dimensions ? ` — ${item.dimensions}` : ''}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Backline */}
              {hasMixerRequirements && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Music className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium text-white">Backline & Mixer Details</span>
                  </div>

                  {techRider?.backline?.mixer_minimum_requirements && (
                    <p className="text-sm text-yellow-300 mb-2">
                      {techRider.backline.mixer_minimum_requirements}
                    </p>
                  )}

                  {techRider?.backline?.cdjs && techRider.backline.cdjs.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-emerald-300 mb-1">CDJs</p>
                      {techRider.backline.cdjs.map((item, index) => (
                        <p key={`${item.model}-${index}`} className="text-sm text-zinc-300">
                          {item.model} x{item.quantity}
                        </p>
                      ))}
                    </div>
                  )}

                  {techRider?.backline?.turntables && techRider.backline.turntables.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-emerald-300 mb-1">Turntables</p>
                      {techRider.backline.turntables.map((item, index) => (
                        <p key={`${item.model}-${index}`} className="text-sm text-zinc-300">
                          {item.model} x{item.quantity}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Equipment */}
              {techRider?.equipment && techRider.equipment.length > 0 && (
                <div className="space-y-4">
                  {/* Venue Must Supply */}
                  {techRider.equipment.filter(e => !e.artist_brings).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Venue Must Supply
                      </p>
                      <div className="space-y-2">
                        {techRider.equipment.filter(e => !e.artist_brings).map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-red-950/20 border border-red-900/30 rounded">
                            <div>
                              <span className="text-sm text-white">{item.name}</span>
                              {item.notes && <span className="text-xs text-zinc-500 ml-2">({item.notes})</span>}
                            </div>
                            <span className="text-sm text-zinc-400">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Artist Brings (Confirmed) */}
                  {techRider.equipment.filter(e => e.artist_brings && !e.notes?.toLowerCase().includes('optional')).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Artist Brings
                      </p>
                      <div className="space-y-2">
                        {techRider.equipment.filter(e => e.artist_brings && !e.notes?.toLowerCase().includes('optional')).map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-green-950/20 border border-green-900/30 rounded">
                            <div>
                              <span className="text-sm text-white">{item.name}</span>
                              {item.notes && <span className="text-xs text-zinc-500 ml-2">({item.notes})</span>}
                            </div>
                            <span className="text-sm text-zinc-400">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Optional (Artist might bring) */}
                  {techRider.equipment.filter(e => e.artist_brings && e.notes?.toLowerCase().includes('optional')).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        Optional (Artist might bring)
                      </p>
                      <div className="space-y-2">
                        {techRider.equipment.filter(e => e.artist_brings && e.notes?.toLowerCase().includes('optional')).map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-yellow-950/20 border border-yellow-900/30 rounded">
                            <div>
                              <span className="text-sm text-white">{item.name}</span>
                              <span className="text-xs text-yellow-500/70 ml-2">(TBC)</span>
                            </div>
                            <span className="text-sm text-zinc-400">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Performance Requirements */}
              {techRider?.performance_requirements && (
                <div className="p-3 bg-indigo-950/30 border border-indigo-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-indigo-400" />
                    <span className="font-medium text-white">Performance Requirements</span>
                  </div>
                  
                  {/* Staff Needs */}
                  {(techRider.performance_requirements.staff?.sound_tech || techRider.performance_requirements.staff?.lighting_tech) && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-indigo-300 mb-1">Staff Needed:</p>
                      <div className="space-y-1">
                        {techRider.performance_requirements.staff?.sound_tech && (
                          <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                            Sound Technician {techRider.performance_requirements.staff.sound_tech_notes && `(${techRider.performance_requirements.staff.sound_tech_notes})`}
                          </div>
                        )}
                        {techRider.performance_requirements.staff?.lighting_tech && (
                          <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                            Lighting Technician {techRider.performance_requirements.staff.lighting_tech_notes && `(${techRider.performance_requirements.staff.lighting_tech_notes})`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Stage Requirements */}
                  {techRider.performance_requirements.stage?.requirements && techRider.performance_requirements.stage.requirements.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-indigo-300 mb-1">Stage Requirements:</p>
                      <div className="space-y-1">
                        {techRider.performance_requirements.stage.requirements.map((req, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                            {req}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Technical Notes */}
              {techRider?.technical_notes && (
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <p className="text-sm font-medium text-zinc-300 mb-2">Technical Notes</p>
                  <p className="text-sm text-zinc-400">{techRider.technical_notes}</p>
                </div>
              )}

              {techRider?.referenced_images && techRider.referenced_images.length > 0 && (
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <p className="text-sm font-medium text-zinc-300 mb-2">Referenced Images / Visual Notes</p>
                  <div className="space-y-1">
                    {techRider.referenced_images.map((reference, index) => (
                      <p key={`${reference}-${index}`} className="text-sm text-zinc-400">
                        {reference}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="hospitality" className="mt-4 space-y-4">
              {/* Accommodation */}
              {hospitalityRider?.accommodation && (
                <div className="p-3 bg-purple-950/30 border border-purple-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Hotel className="h-4 w-4 text-purple-400" />
                    <span className="font-medium text-white">Accommodation</span>
                  </div>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <p>
                      {hospitalityRider.accommodation.nights > 0 ? `${hospitalityRider.accommodation.nights} night(s), ` : ''}
                      {hospitalityRider.accommodation.room_type || 'Accommodation requested'}
                    </p>
                    {(hospitalityRider.accommodation.check_in || hospitalityRider.accommodation.check_out) && (
                      <p>
                        Check-in: {hospitalityRider.accommodation.check_in || 'n/a'} / Check-out: {hospitalityRider.accommodation.check_out || 'n/a'}
                      </p>
                    )}
                    {hospitalityRider.accommodation.location_preference && (
                      <p>Location: {hospitalityRider.accommodation.location_preference}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Ground Transport */}
              {hospitalityRider?.transport_ground && (
                <div className="p-3 bg-green-950/30 border border-green-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="h-4 w-4 text-green-400" />
                    <span className="font-medium text-white">Ground Transport</span>
                  </div>
                  <div className="text-sm text-zinc-400 space-y-1">
                    {(hospitalityRider.transport_ground.pickup_time || hospitalityRider.transport_ground.pickup_location) && (
                      <p>
                        Pickup: {hospitalityRider.transport_ground.pickup_time || 'n/a'} from {hospitalityRider.transport_ground.pickup_location || 'n/a'}
                      </p>
                    )}
                    {hospitalityRider.transport_ground.vehicle_type && (
                      <p>Vehicle: {hospitalityRider.transport_ground.vehicle_type}</p>
                    )}
                    <p>Return: {hospitalityRider.transport_ground.return_required ? 'Required' : 'Not needed'}</p>
                  </div>
                </div>
              )}

              {/* Catering */}
              {hospitalityRider?.catering && (
                <div className="p-3 bg-orange-950/30 border border-orange-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils className="h-4 w-4 text-orange-400" />
                    <span className="font-medium text-white">Catering</span>
                  </div>
                  <div className="text-sm text-zinc-400 space-y-1">
                    {hospitalityRider.catering.meals?.length > 0 && (
                      <p>Meals: {hospitalityRider.catering.meals.join(', ')}</p>
                    )}
                    {hospitalityRider.catering.dietary?.length > 0 && (
                      <p>Dietary: {hospitalityRider.catering.dietary.join(', ')}</p>
                    )}
                    {hospitalityRider.catering.drinks.spirits?.length > 0 && (
                      <p>Spirits: {hospitalityRider.catering.drinks.spirits.join(', ')}</p>
                    )}
                    {hospitalityRider.catering.drinks.mixers?.length > 0 && (
                      <p>Mixers: {hospitalityRider.catering.drinks.mixers.join(', ')}</p>
                    )}
                    {hospitalityRider.catering.drinks.water && (
                      <p>Water required</p>
                    )}
                    {hospitalityRider.catering.drinks.alcopops && (
                      <p>Alcopops required</p>
                    )}
                    {hospitalityRider.catering.special_requests && (
                      <p className="text-yellow-400">{hospitalityRider.catering.special_requests}</p>
                    )}
                  </div>
                </div>
              )}

              {hospitalityRider?.hospitality_notes && (
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <p className="text-sm font-medium text-zinc-300 mb-2">Hospitality Notes</p>
                  <p className="text-sm text-zinc-400">{hospitalityRider.hospitality_notes}</p>
                </div>
              )}

              {!hasHospitality && (
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <p className="text-sm text-zinc-500">No hospitality requirements extracted yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Rider Data?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-zinc-400">
              This will delete all rider data for <strong className="text-white">{artistName}</strong> including:
            </p>
            <ul className="list-disc list-inside text-sm text-zinc-500 space-y-1">
              <li>Technical rider (equipment, audio, transport)</li>
              <li>Hospitality rider (accommodation, catering)</li>
              <li>Associated tasks will not be affected</li>
            </ul>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteRider}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Rider
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Summary Dialog */}
      <Dialog open={showTaskSummary} onOpenChange={setShowTaskSummary}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Rider Extracted Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {uploadResult && (uploadResult.tasks_created || 0) > 0 ? (
              <>
                <div className="p-4 bg-green-950/30 border border-green-700 rounded-lg">
                  <p className="text-green-400 font-medium">
                    {uploadResult.tasks_created} task(s) created
                  </p>
                </div>

                {uploadResult.task_events && uploadResult.task_events.length > 0 && (
                  <div className="space-y-4">
                    {uploadResult.task_events.map((event, eventIndex) => (
                      <div key={event.event_id || `event-${eventIndex}`} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <p className="text-white font-medium mb-2">
                          {event.event_name} ({event.event_date})
                        </p>
                        {event.task_titles && event.task_titles.length > 0 && (
                          <ul className="space-y-1">
                            {event.task_titles.map((title, titleIndex) => (
                              <li key={titleIndex} className="text-zinc-300 text-sm flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">•</span>
                                {title}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {uploadResult.warnings.length > 0 && (
                  <div className="p-4 bg-yellow-950/30 border border-yellow-700 rounded-lg">
                    <p className="text-yellow-400 font-medium mb-2">Warnings</p>
                    <ul className="space-y-1">
                      {uploadResult.warnings.map((warning, warnIndex) => (
                        <li key={warnIndex} className="text-yellow-300 text-sm flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setShowTaskSummary(false);
                      onRiderUpdated?.();
                    }}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                  >
                    Go to Workflow
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTaskSummary(false);
                      onRiderUpdated?.();
                    }}
                    className="border-zinc-700"
                  >
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-white font-medium">Rider data extracted!</p>
                <p className="text-zinc-400 text-sm mt-1">
                  No tasks were created - you can manually create tasks in the Workflow page.
                </p>
                <Button
                  onClick={() => {
                    setShowTaskSummary(false);
                    onRiderUpdated?.();
                  }}
                  className="mt-4 bg-violet-600 hover:bg-violet-700"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive History Dialog */}
      <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-violet-400" />
              Rider History - {artistName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <p className="text-zinc-500 text-sm">
              When you upload a new rider PDF, the previous rider is automatically archived here.
            </p>
            {/* Archive items would be loaded here from the database */}
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Current Rider</p>
                  <p className="text-xs text-zinc-500">Uploaded today</p>
                </div>
                <Button variant="ghost" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </div>
            <p className="text-center text-zinc-600 text-sm">
              No archived riders yet
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
