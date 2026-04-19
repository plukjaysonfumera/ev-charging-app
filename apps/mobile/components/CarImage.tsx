import { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { API_URL } from '../lib/config';

// ── Curated high-quality press photos for popular Philippine market EVs ────────
// Keys are lowercased "{make} {model}" — matched with startsWith for variants.
// Images are official manufacturer / press release photos (no watermark).
const CAR_IMAGE_OVERRIDES: { match: string; url: string }[] = [
  // BYD
  // BYD — using international press release CDN
  { match: 'byd shark',     url: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/shark/pc/exterior/BYD-Shark-exterior-1.jpg' },
  { match: 'byd atto 3',    url: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/atto-3/pc/exterior/BYD-ATTO3-exterior-1.jpg' },
  { match: 'byd seal',      url: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/seal/pc/exterior/BYD-Seal-exterior-1.jpg' },
  { match: 'byd dolphin',   url: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/dolphin/pc/exterior/BYD-Dolphin-exterior-1.jpg' },
  { match: 'byd han',       url: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/han/pc/exterior/BYD-Han-exterior-1.jpg' },
  { match: 'byd sealion 6', url: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/sealion-6/pc/exterior/BYD-Sealion6-exterior-1.jpg' },
  // Hyundai
  { match: 'hyundai ioniq 5', url: 'https://www.hyundai.com/content/dam/hyundai/au/en/models/ioniq5/ioniq5-2024/highlights/ioniq5-2024-highlights-visual-slide-01-m.jpg' },
  { match: 'hyundai ioniq 6', url: 'https://www.hyundai.com/content/dam/hyundai/au/en/models/ioniq6/ioniq6-2023/highlights/ioniq6-2023-highlights-visual-slide-01-m.jpg' },
  { match: 'hyundai kona',    url: 'https://www.hyundai.com/content/dam/hyundai/au/en/models/all-new-kona/all-new-kona-electric/highlights/allnewkona-electric-highlights-slide-01.jpg' },
  // Kia
  { match: 'kia ev6',  url: 'https://www.kia.com/content/dam/kia/ph/models/ev6/overview/visual/kia-ev6-overview-pc-visual-1.jpg' },
  { match: 'kia ev9',  url: 'https://www.kia.com/content/dam/kia/ph/models/ev9/overview/visual/kia-ev9-overview-pc-visual-1.jpg' },
  { match: 'kia niro', url: 'https://www.kia.com/content/dam/kia/ph/models/niro/overview/visual/kia-niro-ev-overview-visual-1.jpg' },
  // MG
  { match: 'mg zs',  url: 'https://www.mgmotor.com.ph/content/dam/mg/ph/models/zs-ev/overview/mg-zs-ev-overview-key-visual.jpg' },
  { match: 'mg4',    url: 'https://www.mgmotor.com.ph/content/dam/mg/ph/models/mg4/overview/mg4-ev-overview-key-visual.jpg' },
  { match: 'mg cyberster', url: 'https://www.mgmotor.com.ph/content/dam/mg/ph/models/cyberster/overview/mg-cyberster-overview-key-visual.jpg' },
  // Tesla
  { match: 'tesla model 3', url: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-3.png' },
  { match: 'tesla model y', url: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-Y.png' },
  { match: 'tesla model s', url: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-S.png' },
  { match: 'tesla model x', url: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-X.png' },
  // Nissan
  { match: 'nissan leaf', url: 'https://www-asia.nissan-cdn.net/content/dam/Nissan/ph/vehicles/leaf/leaf-key-visual.jpg' },
  // BMW
  { match: 'bmw i4',  url: 'https://www.bmw.com.ph/content/dam/bmw/common/all-models/i-series/i4/2022/navigation/bmw-i4-series-overview-thumbnail.png' },
  { match: 'bmw ix',  url: 'https://www.bmw.com.ph/content/dam/bmw/common/all-models/x-series/iX/2021/navigation/bmw-ix-series-overview-thumbnail.png' },
  { match: 'bmw ix1', url: 'https://www.bmw.com.ph/content/dam/bmw/common/all-models/x-series/iX1/2022/navigation/bmw-ix1-series-overview-thumbnail.png' },
  // Mercedes
  { match: 'mercedes eqs', url: 'https://www.mercedes-benz.com.ph/content/dam/hq/passengercars/cars/eqs/eqs-sedan/overview/mercedes-benz-eqs-sedan-design-hotspot-1.jpg' },
  { match: 'mercedes eqb', url: 'https://www.mercedes-benz.com.ph/content/dam/hq/passengercars/cars/eqb/eqb-2021/overview/mercedes-benz-eqb-overview-hero.jpg' },
  // Volvo
  { match: 'volvo ex30', url: 'https://www.volvocars.com/images/v/-/media/applications/pdpspecificationpage/ex30/2024/exterior/volvo-ex30-exterior-blue.jpg' },
  { match: 'volvo ex40', url: 'https://www.volvocars.com/images/v/-/media/applications/pdpspecificationpage/xc40-electric/exterior/xc40-electric-hero.jpg' },
  { match: 'volvo ex90', url: 'https://www.volvocars.com/images/v/-/media/applications/pdpspecificationpage/ex90/exterior/ex90-exterior-hero.jpg' },
];

interface Props {
  make: string;
  model: string;
  width: number;
  height: number;
  borderRadius?: number;
}

const BRAND_PALETTE: Record<string, { bg: string; text: string }> = {
  tesla:           { bg: '#CC0000', text: '#fff' },
  hyundai:         { bg: '#002C5F', text: '#fff' },
  kia:             { bg: '#05141F', text: '#fff' },
  byd:             { bg: '#1B3F8B', text: '#fff' },
  nissan:          { bg: '#C3002F', text: '#fff' },
  bmw:             { bg: '#1C69D4', text: '#fff' },
  'mercedes-benz': { bg: '#222222', text: '#fff' },
  mercedes:        { bg: '#222222', text: '#fff' },
  porsche:         { bg: '#8B1A1A', text: '#fff' },
  volvo:           { bg: '#1B365D', text: '#fff' },
  mg:              { bg: '#8B0000', text: '#fff' },
  rivian:          { bg: '#00A878', text: '#fff' },
  polestar:        { bg: '#0D0D0D', text: '#fff' },
  audi:            { bg: '#BB0A30', text: '#fff' },
  volkswagen:      { bg: '#001E50', text: '#fff' },
  ford:            { bg: '#003087', text: '#fff' },
  chevrolet:       { bg: '#D4AF37', text: '#1A1A1A' },
  gmc:             { bg: '#CC0000', text: '#fff' },
  jeep:            { bg: '#2E5339', text: '#fff' },
  subaru:          { bg: '#013A6B', text: '#fff' },
  lexus:           { bg: '#1A1A1A', text: '#fff' },
  toyota:          { bg: '#EB0A1E', text: '#fff' },
  honda:           { bg: '#CC0000', text: '#fff' },
};

function toSlug(str: string): string {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

function getCuratedImageUrl(make: string, model: string): string | null {
  const key = `${make} ${model}`.toLowerCase().trim();
  const entry = CAR_IMAGE_OVERRIDES.find(e => key.startsWith(e.match));
  return entry?.url ?? null;
}

function getImaginstudioUrl(make: string, model: string, width: number): string {
  // 3× for sharp retina; cap at 1200px
  const px = Math.min(Math.round(width * 3), 1200);
  return (
    `https://cdn.imagin.studio/getimage` +
    `?customer=img` +
    `&make=${toSlug(make)}` +
    `&modelFamily=${toSlug(model)}` +
    `&paintId=color-options-1` +
    `&angle=29` +
    `&width=${px}`
  );
}

export default function CarImage({ make, model, width, height, borderRadius = 0 }: Props) {
  const makeKey = make.toLowerCase().replace(/\s+/g, '-');
  const brand   = BRAND_PALETTE[makeKey] ?? { bg: '#1C1C1E', text: '#fff' };

  // Priority: 1) API DB  2) curated press map  3) Imagin.Studio 3D render
  const curatedUrl  = getCuratedImageUrl(make, model);
  const imaginstUrl = getImaginstudioUrl(make, model, width);

  const [apiUrl,    setApiUrl]    = useState<string | null>(null);
  const [apiChecked, setApiChecked] = useState(false);

  // URL pipeline — resolved once apiChecked
  const primaryUrl  = apiUrl ?? curatedUrl ?? imaginstUrl;
  const hasBackup   = (apiUrl !== null && curatedUrl !== null) ||
                      (apiUrl !== null && !curatedUrl)         ||
                      (curatedUrl !== null);
  const backupUrl   = apiUrl
    ? (curatedUrl ?? imaginstUrl)
    : curatedUrl
      ? imaginstUrl
      : null;

  const [imgStatus,    setImgStatus]    = useState<'loading' | 'ok' | 'error'>('loading');
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  // Fetch DB image on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/v1/car-images?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`
        );
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data.imageUrl) setApiUrl(data.imageUrl);
        }
      } catch { /* network unavailable — skip silently */ }
      if (!cancelled) setApiChecked(true);
    })();
    return () => { cancelled = true; };
  }, [make, model]);

  const showingOk = imgStatus === 'ok' || backupStatus === 'ok';
  const isLoading = !apiChecked || imgStatus === 'loading' || (!showingOk && backupStatus === 'loading');

  return (
    <View style={[styles.root, { width, height, borderRadius, backgroundColor: brand.bg }]}>

      {/* Brand colour fallback — always behind */}
      <View style={styles.fallback}>
        <Text style={[styles.initial, { color: brand.text }]}>{make[0]?.toUpperCase()}</Text>
        <Text style={[styles.brandName, { color: brand.text + 'AA' }]}>{make.toUpperCase()}</Text>
      </View>

      {/* Primary image */}
      {apiChecked && imgStatus !== 'error' && (
        <Image
          source={{ uri: primaryUrl }}
          style={[styles.image, { width, height, opacity: imgStatus === 'ok' ? 1 : 0 }]}
          resizeMode="cover"
          onLoad={() => setImgStatus('ok')}
          onError={() => {
            setImgStatus('error');
            if (hasBackup && backupUrl) setBackupStatus('loading');
          }}
        />
      )}

      {/* Backup image — shown if primary failed */}
      {backupStatus !== 'idle' && backupUrl && backupStatus !== 'error' && (
        <Image
          source={{ uri: backupUrl }}
          style={[styles.image, { width, height, opacity: backupStatus === 'ok' ? 1 : 0 }]}
          resizeMode={backupUrl === imaginstUrl ? 'contain' : 'cover'}
          onLoad={() => setBackupStatus('ok')}
          onError={() => setBackupStatus('error')}
        />
      )}

      {isLoading && !showingOk && (
        <ActivityIndicator
          style={StyleSheet.absoluteFillObject}
          color={brand.text + '99'}
          size="small"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  fallback:  { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  initial:   { fontSize: 72, fontWeight: '900', letterSpacing: -2, opacity: 0.9 },
  brandName: { fontSize: 13, fontWeight: '800', letterSpacing: 4, marginTop: 6, opacity: 0.6 },
  // Explicit dimensions — prevents stretching
  image:     { position: 'absolute', top: 0, left: 0 },
});
