import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  Hammer,
  GraduationCap,
  Palette,
  CheckSquare,
  Layers,
  Search,
  MapPin,
  DollarSign,
  Plus,
  X,
  Phone,
  Flame,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  Smartphone,
  Sparkles,
  Share2,
  AlertCircle,
  Twitter,
  Facebook,
  Copy,
  Download,
  Package,
  Mic,
  MicOff
} from 'lucide-react';
import { JobListing, Category } from './types';
import { CATEGORIES, PRESEEDED_LISTINGS } from './data';
import SuburbProximityMap from './components/SuburbProximityMap';

// Suburb GPS geocoordinates for calculating precise real-world proximity in Zimbabwe
export const SUBURB_COORDINATES: { [key: string]: { lat: number; lng: number; label: string; city: string } } = {
  'mt_pleasant': { lat: -17.7833, lng: 31.0333, label: 'Mt Pleasant, Harare', city: 'Harare' },
  'borrowdale': { lat: -17.7500, lng: 31.1000, label: 'Borrowdale, Harare', city: 'Harare' },
  'avondale': { lat: -17.8005, lng: 31.0333, label: 'Avondale, Harare', city: 'Harare' },
  'chitungwiza': { lat: -18.0125, lng: 31.0711, label: 'Chitungwiza', city: 'Chitungwiza' },
  'ruwa': { lat: -17.8897, lng: 31.2447, label: 'Ruwa East', city: 'Harare' },
  'greendale': { lat: -17.8167, lng: 31.1167, label: 'Greendale, Harare', city: 'Harare' },
  'cbd_harare': { lat: -17.8292, lng: 31.0522, label: 'CBD, Harare', city: 'Harare' },
  'cbd_byo': { lat: -20.1500, lng: 28.5833, label: 'CBD, Bulawayo', city: 'Bulawayo' },
  'hillside_byo': { lat: -20.1833, lng: 28.6167, label: 'Hillside, Bulawayo', city: 'Bulawayo' }
};

export const getSuburbKeyForLocation = (locStr: string): string | null => {
  const norm = locStr.toLowerCase();
  if (norm.includes('pleasant')) return 'mt_pleasant';
  if (norm.includes('borrowdale')) return 'borrowdale';
  if (norm.includes('avondale')) return 'avondale';
  if (norm.includes('chitungwiza') || norm.includes('unit k')) return 'chitungwiza';
  if (norm.includes('ruwa')) return 'ruwa';
  if (norm.includes('greendale')) return 'greendale';
  if (norm.includes('cbd') && (norm.includes('harare') || norm.includes('hz') || norm.includes('har'))) return 'cbd_harare';
  if (norm.includes('cbd') && (norm.includes('bulawayo') || norm.includes('byo'))) return 'cbd_byo';
  if (norm.includes('bulawayo') && !norm.includes('hillside')) return 'cbd_byo';
  if (norm.includes('hillside')) return 'hillside_byo';
  return null;
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getJobDistance = (jobLoc: string, userSubKey: string): number | null => {
  if (!userSubKey || userSubKey === 'all') return null;
  const jobKey = getSuburbKeyForLocation(jobLoc);
  if (!jobKey) {
    const jobNorm = jobLoc.toLowerCase();
    const userSub = SUBURB_COORDINATES[userSubKey];
    if (!userSub) return null;
    
    const userCity = userSub.city.toLowerCase();
    const hasBulawayoInJob = jobNorm.includes('bulawayo') || jobNorm.includes('byo');
    const hasHarareInJob = jobNorm.includes('harare') || jobNorm.includes('chitungwiza') || jobNorm.includes('ruwa') || jobNorm.includes('pleasant') || jobNorm.includes('borrowdale') || jobNorm.includes('avondale') || jobNorm.includes('greendale');
    
    if (userCity === 'bulawayo' && hasBulawayoInJob) {
      return 12; // Same city, average estimation in km
    }
    if (userCity === 'harare' && hasHarareInJob) {
      return 15; // Same city, average estimation in km
    }
    if (userCity === 'bulawayo' && hasHarareInJob) return 440; // different city
    if (userCity === 'harare' && hasBulawayoInJob) return 440; // different city
    
    return 25; // standard fallback
  }
  
  const userCoords = SUBURB_COORDINATES[userSubKey];
  const jobCoords = SUBURB_COORDINATES[jobKey];
  if (!userCoords || !jobCoords) return null;
  
  return calculateDistance(userCoords.lat, userCoords.lng, jobCoords.lat, jobCoords.lng);
};

export default function App() {
  // State managers
  const [listings, setListings] = useState<JobListing[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'payment'>('latest');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Proximity & Suburb Filtering State
  const [userSuburbKey, setUserSuburbKey] = useState<string>(() => {
    return localStorage.getItem('hustlehub_user_suburb') || 'all';
  });
  const [maxDistance, setMaxDistance] = useState<number>(() => {
    const saved = localStorage.getItem('hustlehub_max_distance');
    return saved ? parseFloat(saved) : 25;
  });
  const [isMapVisible, setIsMapVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem('hustlehub_map_visible');
    return saved !== 'false';
  });

  // Director & Owner States (Customizable for user doctortatenda11@gmail.com)
  const [directorName, setDirectorName] = useState<string>(() => {
    return localStorage.getItem('hustlehub_director_name') || 'Dr. Tatenda';
  });
  const [directorPhone, setDirectorPhone] = useState<string>(() => {
    return localStorage.getItem('hustlehub_director_phone') || '+263772411111';
  });
  const [spotlightPrice, setSpotlightPrice] = useState<number>(() => {
    const saved = localStorage.getItem('hustlehub_spotlight_price');
    return saved ? parseFloat(saved) : 1.00;
  });
  const [simulatedRevenues, setSimulatedRevenues] = useState<number>(() => {
    const saved = localStorage.getItem('hustlehub_simulated_earnings');
    return saved ? parseFloat(saved) : 46.00;
  });
  const [isDirectorPanelOpen, setIsDirectorPanelOpen] = useState<boolean>(false);
  const [activeDirectorTab, setActiveDirectorTab] = useState<'vault' | 'playstore'>('vault');
  
  // Google Play Console Publishing States
  const [playStoreStatus, setPlayStoreStatus] = useState<'draft' | 'compiling' | 'live'>(() => {
    return (localStorage.getItem('hustlehub_playstore_status') as 'draft' | 'compiling' | 'live') || 'live';
  });
  const [playStoreInstalls, setPlayStoreInstalls] = useState<number>(() => {
    const saved = localStorage.getItem('hustlehub_playstore_installs');
    return saved ? parseInt(saved) : 12480;
  });
  const [isPlayStoreDemoOpen, setIsPlayStoreDemoOpen] = useState<boolean>(false);
  const [playStoreInstallState, setPlayStoreInstallState] = useState<'install' | 'downloading' | 'installing' | 'installed'>('install');
  const [playStoreProgress, setPlayStoreProgress] = useState<number>(0);
  
  // Create / Post Job Modal states
  const [isPostModalOpen, setIsPostModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('manual');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newPayment, setNewPayment] = useState<string>('');
  const [newPaymentType, setNewPaymentType] = useState<'fixed' | 'hourly'>('fixed');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('+263');
  const [newEmployerName, setNewEmployerName] = useState<string>('');
  const [newIsFeatured, setNewIsFeatured] = useState<boolean>(false);
  
  // Checkout simulation states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<'select' | 'processing' | 'success'>('select');
  const [paymentWallet, setPaymentWallet] = useState<'ecocash' | 'innbucks' | 'onemoney'>('ecocash');
  const [walletNumber, setWalletNumber] = useState<string>('');
  const [tempPendingJob, setTempPendingJob] = useState<JobListing | null>(null);

  // Success Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Share Modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [sharingJob, setSharingJob] = useState<JobListing | null>(null);

  // Load listings from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem('hustlehub_listings');
    if (cached) {
      try {
        setListings(JSON.parse(cached));
      } catch (e) {
        setListings(PRESEEDED_LISTINGS);
      }
    } else {
      localStorage.setItem('hustlehub_listings', JSON.stringify(PRESEEDED_LISTINGS));
      setListings(PRESEEDED_LISTINGS);
    }
  }, []);

  // Save listings helper
  const saveListings = (updated: JobListing[]) => {
    setListings(updated);
    localStorage.setItem('hustlehub_listings', JSON.stringify(updated));
  };

  // Web Speech API Voice Dictation States
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionObj = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionObj) {
      setSpeechSupported(true);
    }
  }, []);

  const handleDictationToggle = () => {
    if (!speechSupported) {
      triggerToast('⚠️ Voice dictation is not supported in this browser.');
      return;
    }

    const SpeechRecognitionObj = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionObj) return;

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const rec = new SpeechRecognitionObj();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsListening(true);
          triggerToast('🎙️ Voice dictation active. Speak clearly into your mic!');
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          if (event.error === 'not-allowed') {
            triggerToast('🎙️ Microphone access denied. Check your browser/iframe permissions!');
          } else {
            triggerToast(`🎙️ Dictation alert: ${event.error}`);
          }
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        rec.onresult = (event: any) => {
          const resultText = event.results[event.results.length - 1][0].transcript;
          if (resultText) {
            setNewDescription(prev => {
              const trimmed = prev.trim();
              return trimmed ? `${trimmed} ${resultText}` : resultText;
            });
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.error(err);
        triggerToast('🎙️ Failed to start speech recognition.');
        setIsListening(false);
      }
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Persist Director configuration updates
  useEffect(() => {
    localStorage.setItem('hustlehub_director_name', directorName);
  }, [directorName]);

  useEffect(() => {
    localStorage.setItem('hustlehub_director_phone', directorPhone);
  }, [directorPhone]);

  useEffect(() => {
    localStorage.setItem('hustlehub_spotlight_price', spotlightPrice.toString());
  }, [spotlightPrice]);

  useEffect(() => {
    localStorage.setItem('hustlehub_simulated_earnings', simulatedRevenues.toString());
  }, [simulatedRevenues]);

  useEffect(() => {
    localStorage.setItem('hustlehub_playstore_status', playStoreStatus);
  }, [playStoreStatus]);

  useEffect(() => {
    localStorage.setItem('hustlehub_playstore_installs', playStoreInstalls.toString());
  }, [playStoreInstalls]);

  useEffect(() => {
    localStorage.setItem('hustlehub_user_suburb', userSuburbKey);
  }, [userSuburbKey]);

  useEffect(() => {
    localStorage.setItem('hustlehub_max_distance', maxDistance.toString());
  }, [maxDistance]);

  useEffect(() => {
    localStorage.setItem('hustlehub_map_visible', isMapVisible.toString());
  }, [isMapVisible]);

  // Render category icon dynamically to avoid type worries
  const getCategoryIcon = (iconName: string, className: string = "w-5 h-5") => {
    switch (iconName) {
      case 'Briefcase': return <Briefcase className={className} />;
      case 'Hammer': return <Hammer className={className} />;
      case 'GraduationCap': return <GraduationCap className={className} />;
      case 'Palette': return <Palette className={className} />;
      case 'CheckSquare': return <CheckSquare className={className} />;
      case 'Layers': return <Layers className={className} />;
      default: return <Briefcase className={className} />;
    }
  };

  // Filter & Search computation
  const filteredListings = listings
    .filter(job => {
      const matchesCategory = activeCategory === 'all' || job.category === activeCategory;
      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.employerName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesProximity = true;
      if (userSuburbKey !== 'all') {
        const dist = getJobDistance(job.location, userSuburbKey);
        if (dist !== null) {
          matchesProximity = dist <= maxDistance;
        }
      }

      return matchesCategory && matchesSearch && matchesProximity;
    })
    .sort((a, b) => {
      // Featured jobs always stick at the top of their sorted subgroups
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;

      if (sortBy === 'payment') {
        return b.payment - a.payment;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Handle Free job posting submission
  const handlePublishFree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newPayment || !newLocation.trim() || !newPhone.trim() || !newEmployerName.trim()) {
      triggerToast('⚠️ Please fill in all requested fields to publish your gig.');
      return;
    }

    const normalizedPhone = newPhone.trim();
    if (normalizedPhone === '+263' || normalizedPhone.length < 7) {
      triggerToast('⚠️ Please enter a valid, complete WhatsApp contact number!');
      return;
    }

    const payVal = parseFloat(newPayment);
    if (isNaN(payVal) || payVal <= 0) {
      triggerToast('⚠️ Please write a positive amount of money you want to pay.');
      return;
    }

    const newJob: JobListing = {
      id: 'job-' + Date.now(),
      title: newTitle,
      description: newDescription,
      payment: payVal,
      paymentType: newPaymentType,
      category: newCategory,
      location: newLocation.trim(),
      phone: normalizedPhone,
      employerName: newEmployerName.trim(),
      isFeatured: false,
      createdAt: new Date().toISOString()
    };

    const updated = [newJob, ...listings];
    saveListings(updated);
    setIsPostModalOpen(false);
    resetForm();
    triggerToast('🎉 Gig posted successfully! Young hustlers can now find it.');
  };

  // Handle Featured job posting checkout trigger
  const triggerFeaturedCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newPayment || !newLocation.trim() || !newPhone.trim() || !newEmployerName.trim()) {
      triggerToast('⚠️ Please fill in all requested fields to set up your featured gig.');
      return;
    }

    const normalizedPhone = newPhone.trim();
    if (normalizedPhone === '+263' || normalizedPhone.length < 7) {
      triggerToast('⚠️ Please enter a valid, complete WhatsApp contact number!');
      return;
    }

    const payVal = parseFloat(newPayment);
    if (isNaN(payVal) || payVal <= 0) {
      triggerToast('⚠️ Please write a positive amount of money you want to pay.');
      return;
    }

    const pendingJob: JobListing = {
      id: 'job-' + Date.now(),
      title: newTitle,
      description: newDescription,
      payment: payVal,
      paymentType: newPaymentType,
      category: newCategory,
      location: newLocation.trim(),
      phone: normalizedPhone,
      employerName: newEmployerName.trim(),
      isFeatured: true, // Pinned at top
      createdAt: new Date().toISOString()
    };

    setTempPendingJob(pendingJob);
    setWalletNumber(newPhone); // Default wallet phone to their contact phone
    setIsPostModalOpen(false);
    setIsCheckoutOpen(true);
    setCheckoutStep('select');
  };

  // Process checkout simulated USSD prompt
  const handleProcessPayment = () => {
    if (!walletNumber) {
      alert('Please provide your mobile wallet phone number.');
      return;
    }
    setCheckoutStep('processing');
    
    // Simulate USSD/app push delay (2.5s)
    setTimeout(() => {
      setCheckoutStep('success');
      setSimulatedRevenues(prev => prev + spotlightPrice);
      if (tempPendingJob) {
        const updated = [tempPendingJob, ...listings];
        saveListings(updated);
      }
    }, 2500);
  };

  const handleFinishCheckout = () => {
    setIsCheckoutOpen(false);
    setTempPendingJob(null);
    resetForm();
    triggerToast('🚀 Spotlight Active! Your gig is now pinned at the very top of the feed.');
  };

  const resetForm = () => {
    setNewTitle('');
    setNewCategory('manual');
    setNewDescription('');
    setNewPayment('');
    setNewPaymentType('fixed');
    setNewLocation('');
    setNewPhone('+263');
    setNewEmployerName('');
    setNewIsFeatured(false);
  };

  // Generate direct click-to-WhatsApp link with standard template message
  const makeWhatsAppUrl = (job: JobListing) => {
    const rawNum = job.phone.replace(/[^0-9]/g, '');
    const cleanNum = rawNum.startsWith('0') ? '263' + rawNum.substring(1) : rawNum;
    const text = `Hi ${job.employerName}, I saw your HustleHub gig "${job.title}" offering $${job.payment}. I am interested in doing this work! Is it still available?`;
    return `https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`;
  };

  // Generate a premium styled text block for social sharing
  const makeShareText = (job: JobListing) => {
    return `🇿🇼 *${job.title.toUpperCase()}*\n\n` +
           `💵 *Budget:* $${job.payment} (${job.paymentType})\n` +
           `📍 *Location:* ${job.location}\n` +
           `👤 *Employer:* ${job.employerName}\n` +
           `📝 *Description:* ${job.description}\n\n` +
           `👉 Chat direct on WhatsApp to apply: ${job.phone}\n\n` +
           `Shared via HustleHub Zimbabwe – Connecting local gigs directly! 🚀`;
  };

  // Trigger high-fidelity Web Share or custom in-app modal fallback
  const handleShareGig = async (job: JobListing) => {
    const shareText = makeShareText(job);
    const appUrl = window.location.href;

    // 1. Attempt using native browser Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: `HustleHub Gig: ${job.title}`,
          text: `🇿🇼 HustleHub Zimbabwe Gig:\n\n${job.title} ($${job.payment})\nLocation: ${job.location}\nApply via WhatsApp: ${job.phone}`,
          url: appUrl
        });
        triggerToast('📤 Thank you for sharing!');
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Web Share API failed or disabled, falling back to custom modal.', err);
        } else {
          return; // Cancelled
        }
      }
    }

    // 2. Open custom modal fallback
    setSharingJob(job);
    setIsShareModalOpen(true);
  };

  // Clipboard copy utility with solid iframe support fallbacks
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          triggerToast('📋 Gig details copied to clipboard!');
        })
        .catch((err) => {
          console.error('Clipboard copy failed:', err);
          fallbackCopyToClipboard(text);
        });
    } else {
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.position = 'fixed';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        triggerToast('📋 Gig details copied to clipboard!');
      } else {
        alert('Could not copy automatically. Please select the text on the screen to copy.');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      alert('Could not copy automatically. Please select the text on the screen to copy.');
    }
  };

  // Google Play simulated installer pipeline
  const handlePlayStoreInstall = () => {
    if (playStoreInstallState === 'installed') {
      setIsPlayStoreDemoOpen(false);
      triggerToast('🎉 Running and launching HustleHub Zimbabwe!');
      return;
    }
    setPlayStoreInstallState('downloading');
    setPlayStoreProgress(8);
    
    const interval = setInterval(() => {
      setPlayStoreProgress(prev => {
        if (prev >= 92) {
          clearInterval(interval);
          setPlayStoreInstallState('installing');
          setTimeout(() => {
            setPlayStoreInstallState('installed');
            setPlayStoreInstalls(p => p + 1);
            triggerToast('🚀 HustleHub Zimbabwe is now successfully installed!');
          }, 1500);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 12;
      });
    }, 350);
  };

  // Get user-friendly category name helper
  const getCategoryName = (catId: string) => {
    return CATEGORIES.find(c => c.id === catId)?.name || 'General';
  };

  // Get relative time from date
  const getRelativeTime = (isoString: string) => {
    const elapsed = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(elapsed / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Clear local edits & restore preseeded data
  const handleResetApp = () => {
    if (confirm('Restore the feed back to default pre-seeded local gigs? This will delete your custom posts.')) {
      saveListings(PRESEEDED_LISTINGS);
      triggerToast('🔄 App database restored to pre-seeded listings.');
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col antialiased selection:bg-emerald-400 selection:text-indigo-950">
      {/* Dynamic Toast Message */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="bg-emerald-950 text-white px-5 py-4 rounded-xl shadow-xl border border-emerald-400/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-sm font-medium">{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-emerald-300 hover:text-white ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner / Strategic Navigation */}
      <header className="backdrop-blur-md bg-white/10 border-b border-white/10 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 relative">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-400 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.4)] shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-emerald-400 text-indigo-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-display">
                    Zimbabwe Official App
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-300 font-medium font-sans">Verified Direct Connections</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight font-display flex items-baseline gap-1">
                  Hustle<span className="text-emerald-400">Hub</span>
                  <span className="text-xs font-normal text-white/40 font-mono ml-2 uppercase">Official app</span>
                </h1>
                <p className="text-sm text-white/80 max-w-lg mt-1 font-sans">
                  The ultimate official marketplace to find local micro-jobs or hire nearby young hustlers. No logins, no complex systems—just direct WhatsApp connections.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDirectorPanelOpen(true)}
                title="Access Managing Director's Portal & Vault"
                className="bg-amber-400/10 hover:bg-amber-400 text-amber-300 hover:text-indigo-950 px-3.5 py-2.5 rounded-xl border border-amber-400/20 hover:border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)] transition duration-200 flex items-center gap-2 text-xs font-black font-display cursor-pointer active:scale-95"
              >
                <span>👑</span>
                <span className="hidden sm:inline font-sans">Platform Treasury:</span>
                <span className="font-mono">${simulatedRevenues.toFixed(2)}</span>
              </button>

              <button
                onClick={handleResetApp}
                title="Restore default pre-seeded listings"
                className="p-2.5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition duration-200 border border-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setIsPostModalOpen(true)}
                id="post-gig-header-button"
                className="bg-emerald-400 hover:bg-emerald-355 text-indigo-950 font-extrabold px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.4)] transition duration-200 flex items-center gap-2 text-sm font-display cursor-pointer active:scale-95"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                Post Gig
              </button>
            </div>
          </div>

          {/* Core Mini Metrics */}
          <div className="flex gap-4 mt-6 pt-5 border-t border-white/10 flex-wrap">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-center flex-1 min-w-[140px] md:flex-initial">
              <span className="block text-2xl font-bold font-display text-white">{listings.length}</span>
              <span className="text-[10px] text-white/55 uppercase font-bold tracking-wide">Total Gigs Listed</span>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-center flex-1 min-w-[140px] md:flex-initial">
              <span className="block text-2xl font-bold font-display text-amber-400">
                {listings.filter(j => j.isFeatured).length}
              </span>
              <span className="text-[10px] text-white/55 uppercase font-bold tracking-wide">Spotlight/Pins</span>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-center flex-1 min-w-[140px] md:flex-initial">
              <span className="block text-2xl font-bold font-display text-emerald-400">100%</span>
              <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wide md:whitespace-nowrap">WhatsApp Match rate</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Panel */}
      <main className="max-w-5xl mx-auto px-4 py-6 md:py-8 flex-1 w-full flex flex-col md:flex-row gap-6">
        
        {/* Left Side menu for category filtering on Desktop, horizontal on mobile */}
        <section className="w-full md:w-64 shrink-0 flex flex-col gap-4">
          {/* Director Executive Badge Card */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-amber-400/20 to-amber-600/5 p-5 rounded-3xl border border-amber-400/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">👑</span>
              <span className="text-[10px] font-black uppercase text-amber-300 tracking-widest">MANAGING DIRECTOR</span>
            </div>
            <h4 className="text-base font-bold font-display text-white tracking-tight">{directorName}</h4>
            <p className="text-[11px] text-white/50 mt-0.5 font-mono">{directorPhone}</p>
            
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 mt-3 space-y-1">
              <div className="flex justify-between text-[10px] text-white/60">
                <span>Treasury Balance:</span>
                <span className="font-bold text-amber-300 font-mono">${simulatedRevenues.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-white/60">
                <span>Spotlight Fee:</span>
                <span className="font-bold text-emerald-300 font-mono">${spotlightPrice.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsDirectorPanelOpen(true)}
              className="mt-3.5 w-full bg-amber-400 hover:bg-amber-300 text-indigo-950 text-[11px] font-extrabold py-2.5 rounded-xl text-center block transition cursor-pointer font-display"
            >
              Configure Portal Settings
            </button>
          </div>

          {/* Google Play Store Badge Promo */}
          <div className="backdrop-blur-xl bg-white/5 p-4 rounded-3xl border border-white/10 text-center space-y-2.5">
            <div className="flex items-center gap-1.5 justify-center">
              <span className="p-1 px-1.5 bg-[#00F2FE]/10 rounded text-[#00F2FE] text-[8px] font-black uppercase tracking-widest font-mono">
                Android App
              </span>
              <span className="text-[10px] text-white/50 uppercase font-bold tracking-wide">Google Play Release</span>
            </div>
            
            <button
              type="button"
              onClick={() => setIsPlayStoreDemoOpen(true)}
              className="group relative inline-flex items-center justify-center gap-2.5 bg-slate-900 border border-white/10 hover:border-emerald-400 p-2.5 rounded-2xl w-full text-left transition duration-300 cursor-pointer"
            >
              {/* Play Store Iconic Tri-Color Logo Minimal Simulation using svg path */}
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 21.5V2.5L18.5 12L3 21.5Z" fill="#10B981" />
                  <path d="M3 21.5V2.5L11 12L3 21.5Z" fill="#3B82F6" />
                  <path d="M3 2.5L11 12L18.5 12L3 2.5Z" fill="#FBBF24" />
                  <path d="M3 21.5L11 12L18.5 12L3 21.5Z" fill="#EF4444" />
                </svg>
              </div>
              <div className="truncate">
                <span className="block text-[8px] uppercase tracking-wider text-white/40 font-mono">GET IT ON</span>
                <span className="block text-[13px] font-black tracking-tight text-white group-hover:text-emerald-300 font-sans">Google Play</span>
              </div>
            </button>

            {playStoreStatus === 'live' ? (
              <div className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 py-1.5 px-2 rounded-xl border border-emerald-400/20 leading-relaxed font-sans">
                🟢 Live & Verified ({playStoreInstalls.toLocaleString()}+ installs)
              </div>
            ) : (
              <div className="text-[10px] text-amber-300 font-medium bg-amber-400/5 py-1.5 px-2 rounded-xl border border-amber-400/15 leading-relaxed font-sans">
                🟡 Web Release (Tap 👑 Director to publish AAB)
              </div>
            )}
          </div>

          {/* 📍 Suburb & Proximity Radius Filter */}
          <div className="backdrop-blur-xl bg-white/5 p-5 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest font-display">
                  Suburb Proximity
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {userSuburbKey !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserSuburbKey('all');
                      triggerToast('📍 Switched back to all Zimbabwe locations.');
                    }}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-black transition uppercase font-mono cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMapVisible(!isMapVisible);
                    triggerToast(isMapVisible ? '🗺️ Position map minimized.' : '🗺️ Position map expanded.');
                  }}
                  className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white font-bold transition uppercase font-mono cursor-pointer bg-white/5 px-2 py-1 rounded-lg border border-white/5 hover:border-white/10"
                  title={isMapVisible ? 'Minimize Map View' : 'Maximize Map View'}
                >
                  {isMapVisible ? (
                    <>
                      <span>Hide Map</span>
                      <ChevronUp className="w-3 h-3 text-white/60" />
                    </>
                  ) : (
                    <>
                      <span>Show Map</span>
                      <ChevronDown className="w-3 h-3 text-white/60" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Suburb Selector Dropdown */}
            <div className="space-y-1.5 font-sans">
              <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest">My Current Location</label>
              <select
                value={userSuburbKey}
                onChange={(e) => {
                  setUserSuburbKey(e.target.value);
                  if (e.target.value !== 'all') {
                    const label = SUBURB_COORDINATES[e.target.value]?.label || 'selected suburb';
                    triggerToast(`📍 Set location to ${label}. Distances are now active!`);
                  }
                }}
                className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl text-xs font-bold px-3 py-2.5 focus:outline-none focus:bg-indigo-950 transition cursor-pointer"
              >
                <option value="all" className="bg-indigo-950 text-white">🌐 All of Zimbabwe</option>
                {Object.entries(SUBURB_COORDINATES).map(([key, data]) => (
                  <option key={key} value={key} className="bg-indigo-950 text-white">
                    📍 {data.label} ({data.city})
                  </option>
                ))}
              </select>
            </div>

            {/* D3 SVG Spatial Proximity Map Visualization */}
            <AnimatePresence initial={false}>
              {isMapVisible && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <SuburbProximityMap
                    userSuburbKey={userSuburbKey}
                    setUserSuburbKey={setUserSuburbKey}
                    maxDistance={maxDistance}
                    setMaxDistance={setMaxDistance}
                    triggerToast={triggerToast}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Distance Slider (Active only if a suburb is selected) */}
            {userSuburbKey !== 'all' ? (
              <div className="space-y-2 pt-1 animate-fade-in">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/50 tracking-wider">
                  <span>Max Radius Limit</span>
                  <span className="text-emerald-400 font-mono font-black">{maxDistance} km</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="50"
                  step="1"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-white/10 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-white/30 font-mono">
                  <span>3 km (Immediate)</span>
                  <span>50 km (Citywide)</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-white/40 leading-relaxed italic bg-black/10 p-2.5 rounded-xl border border-white/5 text-center">
                Select your suburb above to filter micro-gigs near your immediate area dynamically.
              </p>
            )}

            {/* Quick Suburb Groups Links */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <span className="block text-[9px] font-black text-white/50 uppercase tracking-widest">Quick Area Groups</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setUserSuburbKey('mt_pleasant');
                    setMaxDistance(15);
                    triggerToast('📍 Switched to Harare North Hubs!');
                  }}
                  className={`text-[9.5px] font-semibold py-1 px-2.5 rounded-lg border transition cursor-pointer ${
                    userSuburbKey === 'mt_pleasant' || userSuburbKey === 'borrowdale' || userSuburbKey === 'avondale'
                      ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Harare North
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserSuburbKey('chitungwiza');
                    setMaxDistance(20);
                    triggerToast('📍 Focused Chitungwiza!');
                  }}
                  className={`text-[9.5px] font-semibold py-1 px-2.5 rounded-lg border transition cursor-pointer ${
                    userSuburbKey === 'chitungwiza'
                      ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Chitungwiza
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserSuburbKey('cbd_byo');
                    setMaxDistance(15);
                    triggerToast('📍 Switched to Bulawayo Region Hub!');
                  }}
                  className={`text-[9.5px] font-semibold py-1 px-2.5 rounded-lg border transition cursor-pointer ${
                    userSuburbKey === 'cbd_byo' || userSuburbKey === 'hillside_byo'
                      ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Bulawayo
                </button>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/5 p-5 rounded-3xl border border-white/10 hidden md:block">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 px-1">Categories</h3>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between font-semibold px-4 py-2.5 rounded-xl transition duration-150 text-left text-sm cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {getCategoryIcon(cat.icon, `w-4 h-4 ${activeCategory === cat.id ? 'text-emerald-300' : 'text-white/50'}`)}
                    <span>{cat.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeCategory === cat.id ? 'bg-emerald-400 text-indigo-950 font-black' : 'bg-white/10 text-white/50'
                  }`}>
                    {cat.id === 'all' 
                      ? listings.length 
                      : listings.filter(j => j.category === cat.id).length
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Monetisation MVP Sidebar widget */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl text-white rounded-3xl p-6 border border-white/10 shadow-md relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2.5 text-emerald-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <h4 className="font-bold text-xs uppercase tracking-widest font-display">How We Monetise</h4>
            </div>
            <h5 className="font-bold text-base mb-1.5 font-display">Featured Spotlight</h5>
            <p className="text-xs text-white/70 leading-relaxed mb-4">
              Employers pay **$1 (or equivalent via EcoCash / InnBucks)** to pin their gig at the top. This guarantees visibility and 5x faster WhatsApp connects!
            </p>
            <div className="space-y-1.5 mb-1 flex-1">
              <div className="flex items-center gap-2 text-xs text-white/80">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Featured stays at the top</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Stand-out styling & colors</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Immediate notification mark</span>
              </div>
            </div>
            <button
              onClick={() => {
                setIsPostModalOpen(true);
                setNewIsFeatured(true);
              }}
              className="mt-4 w-full bg-emerald-400 hover:bg-emerald-300 text-indigo-950 text-xs font-black py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5 font-display pointer-events-auto cursor-pointer shadow-sm shadow-emerald-400/20 active:scale-[0.98] transition"
            >
              🚀 Feature a Gig for $1
            </button>
          </div>
        </section>

        {/* Right Side: Search and Gig Listings */}
        <section className="flex-1 flex flex-col gap-4">
          {/* Action Filter Bar on Mobile */}
          <div className="md:hidden overflow-x-auto no-scrollbar py-1">
            <div className="flex gap-2 w-max">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    activeCategory === cat.id
                      ? 'bg-white/20 text-white font-bold shadow-sm'
                      : 'bg-white/5 text-white/75 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {getCategoryIcon(cat.icon, `w-3.5 h-3.5 ${activeCategory === cat.id ? 'text-emerald-300' : 'text-white/40'}`)}
                  <span>{cat.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeCategory === cat.id ? 'bg-emerald-400 text-indigo-950 font-black' : 'bg-white/10 text-white/50'
                  }`}>
                    {cat.id === 'all' 
                      ? listings.length 
                      : listings.filter(j => j.category === cat.id).length
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Suburb Select & Radius Tracker for Mobile Users */}
          <div className="md:hidden flex flex-col gap-2 bg-white/5 border border-white/10 p-4 rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 font-display">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nearby Gigs ({userSuburbKey === 'all' ? 'All Zimbabwe' : SUBURB_COORDINATES[userSuburbKey]?.label.split(',')[0]}):</span>
              </span>
              {userSuburbKey !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setUserSuburbKey('all');
                    triggerToast('🌐 Switched back to all Zimbabwe listings.');
                  }}
                  className="text-[10px] text-emerald-400 font-extrabold uppercase font-mono cursor-pointer"
                >
                  Show All ZW
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <select
                value={userSuburbKey}
                onChange={(e) => {
                  setUserSuburbKey(e.target.value);
                  if (e.target.value !== 'all') {
                    triggerToast(`📍 Switched current suburb to ${SUBURB_COORDINATES[e.target.value]?.label.split(',')[0]}`);
                  }
                }}
                className="flex-1 bg-white/10 text-white border border-white/10 rounded-xl text-xs font-semibold p-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-indigo-950 text-white">🌐 All of Zimbabwe</option>
                {Object.entries(SUBURB_COORDINATES).map(([key, data]) => (
                  <option key={key} value={key} className="bg-indigo-950 text-white">
                    📍 {data.label}
                  </option>
                ))}
              </select>
              
              {userSuburbKey !== 'all' && (
                <select
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                  className="bg-white/10 text-emerald-300 border border-white/10 rounded-xl text-xs font-black p-2.5 focus:outline-none cursor-pointer"
                >
                  <option value="5" className="bg-indigo-950 text-white">≤ 5 km</option>
                  <option value="15" className="bg-indigo-950 text-white">≤ 15 km</option>
                  <option value="25" className="bg-indigo-950 text-white">≤ 25 km</option>
                  <option value="50" className="bg-indigo-950 text-white">≤ 50 km</option>
                </select>
              )}
            </div>
          </div>

          {/* Search, Filter Toggles & Actions */}
          <div className="backdrop-blur-xl bg-white/5 p-3.5 rounded-2xl border border-white/10 shadow-xs flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gigs by keyword, location, or name (e.g. yard, Borrowdale)..."
                className="w-full bg-white/10 hover:bg-white/15 focus:bg-indigo-950/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 border border-white/10 focus:border-emerald-400 focus:outline-none transition-all duration-155"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs font-semibold transition"
                >
                  Clear
                </button>
              )}
            </div>
            
            <div className="flex gap-2 items-center shrink-0">
              <span className="text-xs text-white/50 font-medium px-1 ml-1 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'latest' | 'payment')}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl text-xs font-bold px-3 py-2.5 w-full sm:w-auto focus:outline-none focus:bg-indigo-950 transition"
              >
                <option value="latest" className="bg-indigo-950 text-white">⏱️ Latest Gigs</option>
                <option value="payment" className="bg-indigo-950 text-white">💵 Highest Money</option>
              </select>
            </div>
          </div>

          {/* Results Metadata */}
          <div className="flex items-center justify-between px-1.5">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <span className="text-emerald-400">⚡</span>
              {activeCategory !== 'all' ? `${getCategoryName(activeCategory)} Gigs` : 'All Gigs'}
              <span className="text-xs text-white/50 font-semibold normal-case ml-1.5 bg-white/5 py-0.5 px-2 rounded-full">
                {filteredListings.length} listed
              </span>
            </h2>
            {searchQuery && (
              <span className="text-xs text-emerald-300 font-semibold bg-emerald-400/15 px-2.5 py-0.5 rounded-md border border-emerald-400/20">
                "{searchQuery}"
              </span>
            )}
          </div>

          {/* Jobs Listing Grid (Vertical List) */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredListings.length > 0 ? (
                filteredListings.map((job) => {
                  const isExpanded = expandedJobId === job.id;
                  
                  return (
                    <motion.div
                      layout
                      key={job.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`backdrop-blur-xl rounded-2xl border transition-all duration-150 overflow-hidden ${
                        job.isFeatured
                          ? 'backdrop-blur-2xl bg-white/10 border-yellow-400/30 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.5)] relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 bg-gradient-to-r before:bg-yellow-400'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {/* Top Header Row of the Gig item */}
                      <div 
                        onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                        className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Top row indicators */}
                          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold text-white/50">
                            {job.isFeatured && (
                              <span className="flex items-center gap-1 bg-yellow-400/15 text-yellow-300 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px] border border-yellow-400/20">
                                <Flame className="w-3 h-3 fill-yellow-400 text-yellow-400 animate-pulse" />
                                Spotlight
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 bg-white/10 text-white/80 px-2.5 py-0.5 rounded-full capitalize">
                              {getCategoryIcon(
                                CATEGORIES.find(c => c.id === job.category)?.icon || 'Briefcase',
                                "w-3 h-3 text-white/60"
                              )}
                              {getCategoryName(job.category)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-white/40 shrink-0" />
                              <span className="text-white/70 truncate">{job.location}</span>
                            </span>
                            
                            {userSuburbKey !== 'all' && (() => {
                              const dst = getJobDistance(job.location, userSuburbKey);
                              if (dst !== null) {
                                return (
                                  <span className="flex items-center gap-1 bg-emerald-400/15 text-emerald-400 font-black px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-400/20 animate-pulse">
                                    📍 {dst.toFixed(1)} km away
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          <h2 className="text-base md:text-lg font-bold text-white tracking-tight leading-snug">
                            {job.title}
                          </h2>

                          {/* Secondary info tags */}
                          <div className="flex items-center gap-2 text-xs text-white/40">
                            <span className="font-semibold text-white/80">{job.employerName}</span>
                            <span>•</span>
                            <span>{getRelativeTime(job.createdAt)}</span>
                          </div>
                        </div>

                        {/* Price & Expand indicator Panel */}
                        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
                          <div className="text-left md:text-right">
                            <div className="bg-emerald-400/15 text-emerald-300 font-bold px-3 py-1.5 rounded-full border border-emerald-400/30 flex items-center gap-1 shadow-sm shadow-emerald-400/5">
                              <span className="font-display font-black text-lg">${job.payment}</span>
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">
                                {job.paymentType}
                              </span>
                            </div>
                          </div>
                          
                          <div className="p-2 hover:bg-white/10 rounded-xl transition text-white/60 hover:text-white">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable detailed panel */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="px-5 pb-5 pt-1 border-t border-white/10 bg-white/5"
                        >
                          <div className="space-y-4 max-w-3xl pt-2">
                            <div>
                              <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5">Gig Description / Requirements</h4>
                              <p className="text-sm text-white/95 leading-relaxed whitespace-pre-line bg-indigo-950/40 p-4 rounded-xl border border-white/10 font-sans">
                                {job.description}
                              </p>
                            </div>

                            {/* Informative Safety advice */}
                            <div className="bg-amber-400/10 border border-yellow-400/20 rounded-xl p-3 flex items-start gap-2.5 text-yellow-100">
                              <Info className="w-4 h-4 text-yellow-450 text-yellow-400 shrink-0 mt-0.5" />
                              <p className="text-xs leading-relaxed font-sans font-medium text-yellow-200">
                                <strong>Safety Reminder:</strong> Always meet in a secure, crowded public location (e.g. outside a food court or main shopping center) to complete work. Never pay standard fees or upfront registration money to an employer!
                              </p>
                            </div>

                            {/* Direct Action Connect Panel */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/5 p-3.5 rounded-xl border border-white/10">
                              <div className="flex items-center gap-2">
                                <span className="p-2 bg-emerald-400/20 text-emerald-300 rounded-lg">
                                  <Phone className="w-4 h-4" />
                                </span>
                                <div>
                                  <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider font-sans">Direct WhatsApp Contact</span>
                                  <span className="text-xs font-mono font-bold text-emerald-300">{job.phone}</span>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                                <button
                                  onClick={() => handleShareGig(job)}
                                  className="backdrop-blur-md bg-white/15 hover:bg-white/20 border border-white/10 hover:border-white/25 active:scale-[0.97] text-white tracking-tight font-black px-4 py-2.5 rounded-full flex items-center justify-center gap-2 transition duration-150 text-xs font-display shrink-0 cursor-pointer"
                                  title="Share this job via WhatsApp, Facebook, or Twitter"
                                >
                                  <Share2 className="w-4 h-4 text-emerald-400" />
                                  <span>Share Gig</span>
                                </button>

                                <a
                                  href={makeWhatsAppUrl(job)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-emerald-400 hover:bg-emerald-330 hover:scale-[1.01] active:scale-[0.97] text-indigo-950 tracking-tight font-black px-5 py-2.5 rounded-full flex items-center justify-center gap-2 shadow-md transition duration-150 text-xs font-display shrink-0"
                                >
                                  <Smartphone className="w-4 h-4" />
                                  Chat on WhatsApp
                                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center bg-white/5 backdrop-blur-md p-12 rounded-3xl border border-white/10 shadow-xs">
                  <Briefcase className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white font-display">No matching gigs found</h3>
                  <p className="text-sm text-white/60 max-w-sm mx-auto mt-1">
                    Try altering your search keywords, switching the category filters, or be the first to post a new gig!
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                    }}
                    className="mt-4 bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-xl text-xs transition inline-block cursor-pointer border border-white/10"
                  >
                    Reset Filter Search
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Sticky Footer Ad / Call to Action */}
      <div className="max-w-5xl mx-auto w-full px-4 mb-4">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <span className="p-2 bg-white/15 rounded-lg text-lg">📢</span>
             <p className="text-sm font-medium text-white/95">Reach 10,000+ local hustlers. <span className="text-emerald-300 hover:text-emerald-200 underline cursor-pointer font-bold">Advertise your business here.</span></p>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold self-end sm:self-auto shrink-0">Sponsored by ZimHost</div>
        </div>
      </div>

      {/* Structured Minimal Footer */}
      <footer className="backdrop-blur-md bg-white/5 border-t border-white/10 py-6 mt-12 text-center text-xs text-white/45 selection:bg-white/10 font-medium shrink-0">
        <p>© {new Date().getFullYear()} HustleHub Zimbabwe. The official premium platform for quick local gigs & micro-tasks.</p>
        <p className="mt-1 flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" /> Verified WhatsApp matchmaking for young hustlers and micro-businesses.
        </p>
      </footer>

      {/* --- MODAL 1: POST A JOB / GIG --- */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-45 bg-indigo-950/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="backdrop-blur-2xl bg-slate-950/90 rounded-3xl w-full max-w-lg shadow-2xl border border-white/10 overflow-hidden text-white"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold font-display text-white">Post a Local Gig</h2>
                  <p className="text-xs text-white/50 mt-0.5">Reach local workers within minutes via WhatsApp</p>
                </div>
                <button
                  onClick={() => setIsPostModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={newIsFeatured ? triggerFeaturedCheckout : handlePublishFree} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
                {/* Director's Gig Posting Requirements Checklist */}
                <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📢</span>
                    <span className="font-black text-emerald-300 uppercase tracking-wider">Required Guidelines:</span>
                  </div>
                  <p className="text-white/80 leading-relaxed">
                    Per orders of Managing Director <strong>{directorName}</strong>, all listings must adhere to local rules:
                  </p>
                  <ul className="space-y-1 text-white/90 font-medium pl-1">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>Make sure you drop your <strong>exact location</strong> for the work.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>Write the precise <strong>amount of money</strong> you are willing to pay.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>Provide a valid <strong>WhatsApp phone number</strong> so workers can connect instantly.</span>
                    </li>
                  </ul>
                </div>

                {/* Employer Name */}
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Your Name / Title</label>
                  <input
                    type="text"
                    required
                    value={newEmployerName}
                    onChange={(e) => setNewEmployerName(e.target.value)}
                    placeholder="e.g. Mrs. Moyo, Farai K., Auto-Tech Studio"
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-400 focus:bg-indigo-950/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  />
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">What do you need done? (Title)</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Help carrying solar battery, Slashing and weeding garden"
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-400 focus:bg-indigo-950/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  />
                </div>

                {/* Categories and Rates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Task Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-emerald-400 focus:bg-indigo-950/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition text-left"
                    >
                      {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Payment Budget (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-white/40">$</span>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newPayment}
                        onChange={(e) => setNewPayment(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full bg-white/5 border border-white/10 focus:border-emerald-400 focus:bg-indigo-950/40 rounded-xl pl-8 pr-16 py-2.5 text-sm text-white focus:outline-none transition"
                      />
                      <select
                        value={newPaymentType}
                        onChange={(e) => setNewPaymentType(e.target.value as 'fixed' | 'hourly')}
                        className="absolute right-1.5 top-1.5 bottom-1.5 bg-white/10 text-white/80 rounded-lg text-[10px] font-extrabold px-1.5 py-0.5 border border-white/5 focus:outline-none hover:bg-white/20 transition cursor-pointer"
                      >
                        <option value="fixed" className="bg-slate-900 text-white">Fixed</option>
                        <option value="hourly" className="bg-slate-900 text-white">Hourly</option>
                      </select>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold block mt-1">💵 Required: Write the exact amount of money you want to pay.</span>
                  </div>
                </div>

                {/* Location and Telephony */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Specific Location of work</label>
                    <input
                      type="text"
                      required
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="e.g. Avondale, Harare"
                      className="w-full bg-white/5 border border-white/10 focus:border-emerald-400 focus:bg-indigo-950/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                    />
                    <span className="text-[10px] text-emerald-400 font-bold block mt-1">📍 Essential: Drop the specific location for the work.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">WhatsApp Number (For contacts)</label>
                    <input
                      type="text"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="e.g. +263772000000"
                      className="w-full bg-white/5 border border-white/10 focus:border-emerald-400 focus:bg-indigo-950/40 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none transition"
                    />
                    <span className="text-[10px] text-emerald-400 font-bold block mt-1">✨ Crucial: Include your active WhatsApp contact number.</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider">Gig Description / Full Requirements</label>
                    
                    {/* Dictation Controller Trigger */}
                    <button
                      type="button"
                      onClick={handleDictationToggle}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black transition border cursor-pointer animate-fade-in ${
                        isListening
                          ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                          : 'bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 border-white/5 hover:border-white/10'
                      }`}
                      title={isListening ? 'Stop recording voice dictation' : 'Start voice dictation'}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3 h-3 shrink-0" />
                          <span className="font-mono tracking-wider">LISTENING...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3 text-emerald-400 shrink-0 animate-bounce" />
                          <span>VOICE DICTATE</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Specify the work clearly, tools needed, expected date and time, and if food/drinks are provided."
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-400 focus:bg-indigo-950/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  />
                  {isListening && (
                    <span className="text-[10px] text-red-300 font-bold block mt-1 animate-pulse">
                      🎙️ Speak now! HustleHub is converting your speech directly into the input above.
                    </span>
                  )}
                </div>

                {/* Featured Checkbox Option (Business model demonstration) */}
                <div className="bg-yellow-405 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-4 mt-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={newIsFeatured}
                      onChange={(e) => setNewIsFeatured(e.target.checked)}
                      className="mt-1 h-4 w-4 bg-white/10 border-white/20 rounded-sm focus:ring-emerald-500 text-emerald-400"
                    />
                    <label htmlFor="isFeatured" className="select-none cursor-pointer">
                      <span className="block text-xs font-black text-yellow-300 uppercase tracking-wide flex items-center gap-1.5">
                        🚀 Boost Gig: Spotlight Pin (Costs ${spotlightPrice.toFixed(2)})
                      </span>
                      <span className="block text-xs text-white/70 leading-relaxed mt-0.5">
                        Our premium option pins your job listing at the top of all search listings and highlights it in amber colors for fast connections. <em>Credited directly to Managing Director {directorName}!</em>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Modal actions */}
                <div className="pt-3 flex gap-3 flex-col sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPostModalOpen(false);
                      resetForm();
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-bold py-3 rounded-xl text-sm transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  {newIsFeatured ? (
                    <button
                      type="submit"
                      className="flex-1 bg-amber-400 hover:bg-amber-300 active:scale-[0.95] text-indigo-950 font-black py-3 rounded-xl text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer font-display"
                    >
                      🚀 Boost and Publish (${spotlightPrice.toFixed(2)})
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.95] text-indigo-950 font-black py-3 rounded-xl text-sm shadow-md transition cursor-pointer font-display"
                    >
                      Publish Free Gig
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: MOBILE MONEY PAYMENT GATEWAY (EcoCash/InnBucks Integration) --- */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-45 bg-indigo-950/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="backdrop-blur-2xl bg-slate-950/95 rounded-3xl w-full max-w-sm shadow-2xl border border-white/10 overflow-hidden text-white"
            >
              {checkoutStep === 'select' && (
                <div className="p-6 space-y-5">
                  <div className="text-center">
                    <div className="bg-amber-400/10 text-amber-300 border border-amber-400/20 font-black text-xs px-2.5 py-1 rounded-full uppercase tracking-wider inline-block font-display">
                      Spotlight Pinned Priority Billing
                    </div>
                    <h2 className="text-xl font-bold font-display text-white mt-2">HustleHub Spotlight Billing</h2>
                    <p className="text-xs text-white/70 mt-1">Upgrade your gig to Pinned Top Priority for only <strong className="text-amber-300">${spotlightPrice.toFixed(2)} USD</strong></p>
                    <div className="bg-white/5 p-2 rounded-xl text-[10.5px] text-amber-200/90 border border-amber-400/20 mt-3 text-center leading-relaxed font-sans">
                       👑 Routed to Director Treasury Ledger:<br />
                       <strong className="text-white font-semibold font-display">{directorName} ({directorPhone})</strong>
                    </div>
                  </div>

                  {/* Wallet Select Option */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">Select Mobile Money Wallet</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentWallet('ecocash')}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 cursor-pointer transition ${
                          paymentWallet === 'ecocash'
                            ? 'border-blue-500 bg-blue-500/20 text-blue-200'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/60'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 self-end -mr-1" />
                        <span className="text-sm font-black font-display tracking-tight text-blue-400">EcoCash</span>
                        <span className="text-[9px] text-white/40 font-bold uppercase">USD/ZIG</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentWallet('innbucks')}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 cursor-pointer transition ${
                          paymentWallet === 'innbucks'
                            ? 'border-yellow-500 bg-yellow-500/20 text-yellow-100'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/60'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-yellow-400 shrink-0 self-end -mr-1" />
                        <span className="text-sm font-black font-display tracking-tight text-yellow-400">InnBucks</span>
                        <span className="text-[9px] text-white/40 font-bold uppercase">USD Direct</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentWallet('onemoney')}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 cursor-pointer transition ${
                          paymentWallet === 'onemoney'
                            ? 'border-orange-500 bg-orange-500/20 text-orange-200'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/60'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0 self-end -mr-1" />
                        <span className="text-sm font-black font-display tracking-tight text-orange-400">OneMoney</span>
                        <span className="text-[9px] text-white/40 font-bold uppercase">ZWL/USD</span>
                      </button>
                    </div>
                  </div>

                  {/* Wallet Phone details */}
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                      {paymentWallet === 'ecocash' ? 'EcoCash' : paymentWallet === 'innbucks' ? 'InnBucks' : 'OneMoney'} Wallet phone number
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="text"
                        required
                        value={walletNumber}
                        onChange={(e) => setWalletNumber(e.target.value)}
                        placeholder="e.g. 0772123456"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:bg-indigo-950/40 font-mono transition"
                      />
                    </div>
                  </div>

                  {/* Transaction summary */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1.5">
                    <div className="flex justify-between text-xs text-white/50">
                      <span>Item</span>
                      <span className="font-semibold text-white/90">1x Spotlight/Pinned Spot (24h)</span>
                    </div>
                    <div className="flex justify-between text-xs text-white/50">
                      <span>Gateway Fee</span>
                      <span className="font-semibold text-white/90">$0.00</span>
                    </div>
                    <div className="h-px bg-white/10 my-1" />
                    <div className="flex justify-between text-sm font-bold text-white">
                      <span>Total Budget Charged</span>
                      <span className="text-emerald-405 text-emerald-300 font-extrabold">${spotlightPrice.toFixed(2)} USD</span>
                    </div>
                  </div>

                  {/* Secure payment protection disclaimer */}
                  <div className="flex items-start gap-2 text-xs text-emerald-100 bg-emerald-400/10 p-2.5 rounded-lg border border-emerald-400/20">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-emerald-250 font-medium">Secured with SSL encryption. The system will prompt your mobile wallet automatically for the spotlight deposit.</p>
                  </div>

                  {/* Submit Actions */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCheckoutOpen(false);
                        setTempPendingJob(null);
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-bold py-3 rounded-xl text-sm transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessPayment}
                      className="flex-1 bg-emerald-400 hover:bg-emerald-330 active:scale-[0.95] text-indigo-950 font-black py-3 rounded-xl text-sm transition shadow-md font-display cursor-pointer"
                    >
                      Process ${spotlightPrice.toFixed(2)}
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === 'processing' && (
                <div className="p-10 text-center space-y-5">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
                    <Smartphone className="w-6 h-6 text-emerald-400 shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-white font-sans">Verifying Wallet Balance...</h3>
                    <p className="text-xs text-white/60 max-w-xs mx-auto mt-1 leading-relaxed font-sans">
                      Requesting mobile money push gateway for <strong className="text-emerald-300">{walletNumber}</strong>. Please confirm the pin prompt on your device to finalize the spotlight charge.
                    </p>
                  </div>
                  <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider bg-emerald-400/10 py-1.5 px-3 rounded-lg inline-block border border-emerald-400/20 font-mono">
                    Awaiting secure handshake...
                  </div>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="p-8 text-center space-y-5">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 border border-emerald-400/35">
                    <Check className="w-9 h-9 stroke-[3]" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold font-display text-emerald-400">Payment Confirmed!</h3>
                    <p className="text-xs text-white/70 mt-1 max-w-xs mx-auto font-sans">
                      EcoCash ${spotlightPrice.toFixed(2)} confirmation received successfully. Your premium spotlight gig has been activated and boosted to the top of the feed!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinishCheckout}
                    className="w-full bg-emerald-400 hover:bg-emerald-300 active:scale-[0.95] text-indigo-950 font-black py-3 rounded-xl text-sm transition cursor-pointer font-display"
                  >
                    Take me to Dashboard
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: MANAGING DIRECTOR EXECUTIVE CONTROL PANEL & TREASURY SUITE --- */}
      <AnimatePresence>
        {isDirectorPanelOpen && (
          <div className="fixed inset-0 z-45 bg-amber-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="backdrop-blur-2xl bg-slate-950/95 rounded-3xl w-full max-w-md shadow-2xl border border-amber-400/30 overflow-hidden text-white"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-400/10 to-transparent">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👑</span>
                  <div>
                    <h2 className="text-base font-bold font-display text-white">Director's Secure Workspace</h2>
                    <p className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">HustleHub Zimbabwe MVP</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDirectorPanelOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-white/10 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setActiveDirectorTab('vault')}
                  className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 ${
                    activeDirectorTab === 'vault'
                      ? 'border-amber-400 text-amber-300 bg-amber-400/5 font-black'
                      : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  💼 Treasury Vault
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDirectorTab('playstore')}
                  className={`flex-1 py-3 text-center transition cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                    activeDirectorTab === 'playstore'
                      ? 'border-emerald-400 text-emerald-300 bg-emerald-400/5 font-black'
                      : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🤖 Google Play Console
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar">
                {activeDirectorTab === 'vault' ? (
                  <>
                    {/* Official Revenue Ledger Block */}
                    <div className="bg-gradient-to-br from-amber-500/20 to-indigo-950/40 p-5 rounded-2xl border border-amber-400/20 text-center relative overflow-hidden animate-fade-in">
                      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-16 h-16 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
                      <span className="text-stone-300 text-[10px] uppercase font-bold tracking-widest block font-display">Revenue Balance Ledger (Treasury)</span>
                      <span className="text-3xl font-black font-display text-amber-300 block my-1">
                        ${simulatedRevenues.toFixed(2)} USD
                      </span>
                      <p className="text-[11px] text-white/70 leading-relaxed max-w-xs mx-auto font-sans">
                        All organic spotlight boosts from micro-businesses route direct transaction fees directly to your ledger treasury.
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-4 font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            setSimulatedRevenues(prev => prev + 10);
                            triggerToast('💰 Logged manual cash deposit of $10.00 USD to ledger!');
                          }}
                          className="bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 rounded-lg py-1.5 text-[10px] font-bold transition cursor-pointer active:scale-95"
                        >
                          ➕ Log Manual Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSimulatedRevenues(0);
                            localStorage.setItem('hustlehub_simulated_earnings', '0');
                            triggerToast('🧹 Treasury ledger has been re-indexed.');
                          }}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-lg py-1.5 text-[10px] font-bold transition cursor-pointer active:scale-95"
                        >
                          🧹 Reset Ledger
                        </button>
                      </div>
                    </div>

                    {/* Director details form parameters */}
                    <div className="space-y-4">
                      <div className="border-t border-white/10 pt-4">
                        <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider mb-3">Owner Settings</h3>
                      </div>

                      {/* Director Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5">Managing Director / Owner Name</label>
                        <input
                          type="text"
                          required
                          value={directorName}
                          onChange={(e) => setDirectorName(e.target.value)}
                          placeholder="e.g. Dr. Tatenda"
                          className="w-full bg-white/5 border border-white/10 focus:border-amber-400 focus:bg-indigo-950/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition"
                        />
                      </div>

                      {/* Director Phone/Recipient EcoCash */}
                      <div>
                        <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5">Direct Recipient EcoCash Number</label>
                        <input
                          type="text"
                          required
                          value={directorPhone}
                          onChange={(e) => setDirectorPhone(e.target.value)}
                          placeholder="e.g. +263772411111"
                          className="w-full bg-white/5 border border-white/10 focus:border-amber-400 focus:bg-indigo-950/40 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none transition"
                        />
                      </div>

                      {/* Custom Spotlight Pricing Rate */}
                      <div>
                        <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5">Adjust Price per Spotlight Boost (USD)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-300">$</span>
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            required
                            value={spotlightPrice}
                            onChange={(e) => setSpotlightPrice(Math.max(0.25, parseFloat(e.target.value) || 1.00))}
                            className="w-full bg-white/5 border border-white/10 focus:border-amber-400 focus:bg-indigo-950/40 rounded-xl pl-7 pr-3 py-2 text-sm font-bold font-mono text-white focus:outline-none transition"
                          />
                        </div>
                        <span className="text-[10px] text-white/40 block mt-1">
                          Updates job posting checkout requirements for all clients in real-time.
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-2xl p-4 text-[11px] leading-relaxed text-emerald-200">
                      ⚡ <strong>Recipient Gateways:</strong> Specify your correct, verified local business telephone above. Real-time billing routes transactions straight to your platform ledger desk on client checkouts.
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    {/* Google Play Store Header Info Card */}
                    <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">Play Console Release</span>
                          <h4 className="text-sm font-bold truncate">com.hustlehub.zimbabwe.v1</h4>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/30 p-2.5 rounded-lg border border-white/5 mt-3">
                        <div>
                          <span className="text-white/40">SDK API:</span> <strong className="text-white">Android 34 (Upside)</strong>
                        </div>
                        <div>
                          <span className="text-white/40">Size:</span> <strong className="text-white">3.4 MB (PWA Core)</strong>
                        </div>
                        <div>
                          <span className="text-white/40">Version:</span> <strong className="text-white">1.0.4-release</strong>
                        </div>
                        <div>
                          <span className="text-white/40">Type:</span> <strong className="text-emerald-300">Google Bundle (AAB)</strong>
                        </div>
                      </div>
                    </div>

                    {playStoreStatus === 'draft' && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-3">
                        <span className="text-stone-400 text-xs">Ready for App Store Compilation & Deployment</span>
                        <p className="text-[11px] text-white/60">
                          Package the direct Web App framework, linked <code>manifest.json</code> metadata, and custom assets into a sign-sealed production-ready Google Play application.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPlayStoreStatus('compiling');
                            setTimeout(() => {
                              setPlayStoreStatus('live');
                              setPlayStoreInstalls(prev => prev + 1240);
                              triggerToast('🚀 Congratulations! HustleHub Zimbabwe is now LIVE in the Google Appstore!');
                            }, 4500);
                          }}
                          className="w-full bg-emerald-400 hover:bg-emerald-300 text-indigo-950 font-black py-2.5 rounded-xl text-xs uppercase tracking-wide transition cursor-pointer"
                        >
                          📦 Compile AAB & Publish to Play Store
                        </button>
                      </div>
                    )}

                    {playStoreStatus === 'compiling' && (
                      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 space-y-4 font-mono text-[11px] text-emerald-300">
                        <div className="flex items-center gap-2 text-white font-bold text-xs uppercase font-sans">
                          <span className="h-2 w-2 rounded-full bg-yellow-400 animate-ping" />
                          <span>Compiling Production AAB...</span>
                        </div>
                        <div className="space-y-1.5 h-28 overflow-y-auto no-scrollbar pt-1 border-t border-white/10 text-[10px]">
                          <div>&gt; npx bubblewrap build --manifest=/public/manifest.json</div>
                          <div className="text-white/50">&gt; Building Android Asset Studio packages...</div>
                          <div className="text-white/50">&gt; Generating keystore certificates...</div>
                          <div className="text-white/60">&gt; Verifying content security boundaries...</div>
                          <div className="animate-pulse text-amber-300">&gt; Optimizing offline caching layer and bundle...</div>
                          <div className="animate-pulse">&gt; Submitting signed binary package to Google Play Developer API...</div>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1 relative overflow-hidden">
                          <div className="bg-emerald-400 h-full w-2/3 rounded-full animate-[progress_4.5s_ease-in-out_infinite]" />
                        </div>
                      </div>
                    )}

                    {playStoreStatus === 'live' && (
                      <div className="space-y-3">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                          <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1 text-xs">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>APPROVED: LIVE ON GOOGLE PLAY STORE!</span>
                          </div>
                          <p className="text-[11px] text-white/70 leading-relaxed">
                            Your application is successfully distributed across Google devices. Buyers and micro-job seekers can access the app store bundle.
                          </p>

                          <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="bg-black/40 px-3 py-2 rounded-xl text-center border border-white/5">
                              <span className="text-[9px] text-white/50 block font-sans uppercase">Total Installs</span>
                              <span className="text-lg font-black text-white font-mono">{playStoreInstalls.toLocaleString()}</span>
                            </div>
                            <div className="bg-black/40 px-3 py-2 rounded-xl text-center border border-white/5">
                              <span className="text-[9px] text-white/50 block font-sans uppercase">Play Store rating</span>
                              <span className="text-lg font-black text-amber-300">4.9 ⭐</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlayStoreDemoOpen(true);
                              setIsDirectorPanelOpen(false);
                            }}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-2 px-1 text-[10.5px] font-bold text-center transition cursor-pointer flex flex-col items-center justify-center gap-1"
                          >
                            <span>📺</span>
                            <span>View App Store</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              // Trigger a virtual file download of manifest
                              const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                                JSON.stringify({
                                  short_name: "HustleHub",
                                  name: "HustleHub Zimbabwe - Gigs & Gwashes",
                                  start_url: "/",
                                  background_color: "#020617",
                                  theme_color: "#10b981",
                                  display: "standalone"
                                }, null, 2)
                              )}`;
                              const downloadAnchor = document.createElement('a');
                              downloadAnchor.setAttribute("href", jsonString);
                              downloadAnchor.setAttribute("download", "hustlehub_web_manifest.json");
                              document.body.appendChild(downloadAnchor);
                              downloadAnchor.click();
                              downloadAnchor.remove();
                              triggerToast('💾 Android PWA manifest configuration downloaded!');
                            }}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 rounded-xl py-2 px-1 text-[10.5px] font-bold text-center transition cursor-pointer flex flex-col items-center justify-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Get Manifest</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPlayStoreStatus('draft');
                              triggerToast('⚠️ Production app taken offline to testing draft mode.');
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-300 rounded-xl py-2 px-1 text-[10.5px] font-bold text-center transition cursor-pointer flex flex-col items-center justify-center gap-1"
                          >
                            <span>⚠️</span>
                            <span>Take Offline</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1 text-xs">
                      <span className="text-white font-bold block mb-1">How do we upload to Google Play?</span>
                      <ol className="list-decimal pl-4 text-white/70 space-y-1 text-[11px] leading-relaxed">
                        <li>Register a Google Play Developer Account.</li>
                        <li>Export your PWA configuration with <code>manifest.json</code>.</li>
                        <li>Run PWA-to-Android compile workflows (Bubblewrap SDK or Capacitor).</li>
                        <li>Upload your signed <code>.aab</code> package to Google Play Console!</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/10 flex">
                <button
                  type="button"
                  onClick={() => {
                    setIsDirectorPanelOpen(false);
                    triggerToast('💼 Settings saved successfully! Director mode up to date.');
                  }}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black py-3 rounded-xl text-xs uppercase tracking-wide transition shadow-md font-display cursor-pointer"
                >
                  Save & Lock Workspace
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 4: SHARE GIG MODAL --- */}
      <AnimatePresence>
        {isShareModalOpen && sharingJob && (
          <div className="fixed inset-0 z-45 bg-indigo-950/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="backdrop-blur-2xl bg-slate-950/95 rounded-3xl w-full max-w-sm shadow-2xl border border-white/10 overflow-hidden text-white"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-400/10 to-transparent">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg">
                    <Share2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold font-display text-white">Share This Gig</h2>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-mono">Connect & empower</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block mb-1">Previewing Content</span>
                  <p className="text-slate-200 font-bold truncate">{sharingJob.title}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Budget: ${sharingJob.payment} ({sharingJob.paymentType}) • {sharingJob.location}</p>
                </div>

                <div className="space-y-2">
                  {/* Share on WhatsApp */}
                  <button
                    onClick={() => {
                      const text = makeShareText(sharingJob);
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                      setIsShareModalOpen(false);
                      triggerToast('💬 Redirected to WhatsApp Share!');
                    }}
                    className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-150 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    Share on WhatsApp Chat
                  </button>

                  {/* Share on Twitter/X */}
                  <button
                    onClick={() => {
                      const hashtag = 'HustleHubZim';
                      const customTweet = `🇿🇼 *Local Gig Listing!*\n\n${sharingJob.title}\nBudget: $${sharingJob.payment}\nLocation: ${sharingJob.location}\n\nApply direct via WhatsApp: ${sharingJob.phone}\n\n#${hashtag}`;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(customTweet)}`, '_blank');
                      setIsShareModalOpen(false);
                      triggerToast('🐦 Redirected to Twitter Share!');
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-150 cursor-pointer"
                  >
                    <Twitter className="w-4 h-4 text-sky-400 fill-current" />
                    Share on Twitter / X
                  </button>

                  {/* Share on Facebook */}
                  <button
                    onClick={() => {
                      const shareUrl = window.location.href;
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
                      setIsShareModalOpen(false);
                      triggerToast('🔵 Redirected to Facebook Share!');
                    }}
                    className="w-full bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 text-blue-400 font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-150 cursor-pointer"
                  >
                    <Facebook className="w-4 h-4 text-blue-500 fill-current" />
                    Share on Facebook Timeline
                  </button>

                  <div className="relative my-4 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <span className="relative bg-[#020617] px-3 text-[10px] text-white/40 uppercase font-black tracking-widest">or Copy</span>
                  </div>

                  {/* Copy Details */}
                  <button
                    onClick={() => {
                      const text = makeShareText(sharingJob);
                      copyToClipboard(text);
                      setIsShareModalOpen(false);
                    }}
                    className="w-full bg-emerald-400 text-indigo-950 hover:bg-emerald-300 font-black py-3 rounded-xl text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition duration-150 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Details to Clipboard
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 5: GOOGLE PLAY STORE SIMULATION PORTAL --- */}
      <AnimatePresence>
        {isPlayStoreDemoOpen && (
          <div className="fixed inset-0 z-45 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto no-scrollbar">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5 overflow-hidden text-stone-200 font-sans"
            >
              {/* Google Play Store Top Navigation Bar */}
              <div className="p-4 bg-[#1F1F1F] flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    {/* Play Store Iconic Tri-Color Logo Minimal Simulation */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 21.5V2.5L18.5 12L3 21.5Z" fill="#10B981" />
                      <path d="M3 21.5V2.5L11 12L3 21.5Z" fill="#3B82F6" />
                      <path d="M3 2.5L11 12L18.5 12L3 2.5Z" fill="#FBBF24" />
                      <path d="M3 21.5L11 12L18.5 12L3 21.5Z" fill="#EF4444" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">Google Play</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlayStoreDemoOpen(false)}
                  className="p-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold transition cursor-pointer"
                >
                  Close Market
                </button>
              </div>

              {/* App Meta Info Listing */}
              <div className="p-5 space-y-6">
                <div className="flex gap-4">
                  {/* Huge icon */}
                  <div className="w-16 h-16 bg-emerald-400 rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.3)] shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="truncate">
                    <h2 className="text-lg font-black tracking-tight text-white leading-tight font-display">HustleHub Zimbabwe</h2>
                    <p className="text-emerald-400 text-xs font-bold font-sans mt-0.5">{directorName} Digital Labs Ltd.</p>
                    <span className="text-[10px] text-white/40 block mt-1 font-mono">Contains Ads • In-App Purchases</span>
                  </div>
                </div>

                {/* Rating indicators bar */}
                <div className="grid grid-cols-3 divide-x divide-white/10 text-center py-1 border-y border-white/5 bg-white/5 rounded-2xl">
                  <div>
                    <span className="block text-sm font-black text-white">4.9 ★</span>
                    <span className="text-[9px] text-white/45 uppercase font-bold tracking-wider">842 reviews</span>
                  </div>
                  <div>
                    <span className="block text-sm font-black text-white">{playStoreInstalls.toLocaleString()}</span>
                    <span className="text-[9px] text-white/45 uppercase font-bold tracking-wider">Downloads</span>
                  </div>
                  <div>
                    <span className="block text-sm font-black text-white">E</span>
                    <span className="text-[9px] text-white/45 uppercase font-bold tracking-wider">Rated for 3+</span>
                  </div>
                </div>

                {/* Dynamic Installation Simulation Action Trigger */}
                <div className="space-y-2">
                  {playStoreInstallState === 'install' && (
                    <button
                      type="button"
                      onClick={handlePlayStoreInstall}
                      className="w-full bg-[#01875f] hover:bg-[#01704f] text-white font-bold py-3 rounded-full text-xs uppercase tracking-wider transition cursor-pointer"
                    >
                      Install App Version
                    </button>
                  )}

                  {playStoreInstallState === 'downloading' && (
                    <div className="space-y-2">
                      <div className="w-full bg-white/10 rounded-full h-1.5 relative overflow-hidden">
                        <div
                          style={{ width: `${playStoreProgress}%` }}
                          className="bg-[#01875f] h-full rounded-full transition-all duration-300"
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-white/60 font-mono">
                        <span>Downloading appstore bundle...</span>
                        <span className="font-bold text-white">{playStoreProgress}%</span>
                      </div>
                    </div>
                  )}

                  {playStoreInstallState === 'installing' && (
                    <div className="space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-white/70 font-bold uppercase tracking-wider animate-pulse">Installing secure launcher...</span>
                      </div>
                      <p className="text-[9px] text-white/40">Aligning Android app configurations</p>
                    </div>
                  )}

                  {playStoreInstallState === 'installed' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPlayStoreInstallState('install');
                          triggerToast('🔄 Reset app store download status.');
                        }}
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-full text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        Uninstall
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayStoreDemoOpen(false);
                          triggerToast('🚀 Launched HustleHub Zim client!');
                        }}
                        className="w-full bg-[#01875f] hover:bg-[#01704f] text-white font-extrabold py-3 rounded-full text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        Open App
                      </button>
                    </div>
                  )}

                  <div className="text-center">
                    <span className="text-[10px] text-[#01875f] hover:underline cursor-pointer font-bold block mt-1">
                      🛡️ Play Protect Verified • Secure Download
                    </span>
                  </div>
                </div>

                {/* Localized Zimbabwean Reviews Block */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">What users in Zimbabwe say</h3>
                  
                  <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar text-xs">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between text-white font-semibold text-[11px] mb-1">
                        <span>Tinashe M. (Harare)</span>
                        <span className="text-amber-400">★★★★★</span>
                      </div>
                      <p className="text-white/70 text-[11px] leading-relaxed">
                        "I got 3 quick cleaning gigs in Groombridge in one afternoon! It connects directly to the homeowner's WhatsApp with no login hassle."
                      </p>
                    </div>

                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between text-white font-semibold text-[11px] mb-1">
                        <span>Nokutenda C. (Bulawayo)</span>
                        <span className="text-amber-400">★★★★★</span>
                      </div>
                      <p className="text-white/70 text-[11px] leading-relaxed">
                        "EcoCash payments are smooth. Highly recommend for any young person in Zim looking to secure fast money."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dev details information */}
                <div className="bg-[#1F1F1F] p-4 rounded-2xl text-[10.5px] text-white/60 space-y-1 font-mono">
                  <span className="text-white font-bold block mb-1 font-sans">Contact Developer</span>
                  <div>• Email: doctortatenda11@gmail.com</div>
                  <div>• Whatsapp: {directorPhone}</div>
                  <div>• Location: Harare, Zimbabwe</div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
