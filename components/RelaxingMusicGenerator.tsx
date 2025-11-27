
import React, { useState, useCallback } from 'react';
import { generateRelaxingPrompts, generateVideo, RelaxingPromptsResponse } from '../services/geminiService.ts';
import VideoPanel from './VideoPanel.tsx';
import { useLanguage } from './LanguageContext.tsx';

const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

const cameraOptions = [
    'Static (No Movement)',
    'Dolly In',
    'Dolly Out',
    'Truck / Track Left',
    'Truck / Track Right',
    'Crane / Jib Up',
    'Crane / Jib Down',
    'Tilt Up',
    'Tilt Down',
    'Pan Left',
    'Pan Right',
    'Orbit / Arc Shot',
    'Steadicam Walkthrough',
    'Handheld Shake',
    'Zoom In',
    'Zoom Out',
    'Push In Reveal',
    'Pull Away Reveal',
    'Whip Pan',
    'Rack Focus Move',
    'FPV Drone Flythrough'
];

const shotOptions = [
    'Extreme Wide Shot (EWS)',
    'Wide Shot (WS)',
    'Full Shot (FS)',
    'Medium Wide Shot (MWS)',
    'Medium Shot (MS)',
    'Medium Close-Up (MCU)',
    'Close-Up (CU)',
    'Extreme Close-Up (ECU)',
    'Over-the-Shoulder Shot (OTS)',
    'Point of View (POV)',
    'Two Shot',
    'Three Shot',
    'Cowboy Shot',
    'Low Angle Shot',
    'High Angle Shot',
    'Top Shot / Bird’s Eye View',
    'Dutch Angle / Dutch Tilt',
    'Profile Shot',
    'Cutaway Shot',
    'Insert Shot'
];

const styleGroups = [
    {
        label: "General & Realistic (Original)",
        options: [
            'Cozy 3D Render',
            'Lofi Anime',
            'Cinematic Realism',
            'Cyberpunk Neon',
            'Studio Ghibli Aesthetic',
            'Minimalist Vector',
            'Fantasy Landscape',
            'Watercolor',
            'Abstract 3D',
            'Hyper-Realistic 8K',
            'Ultra Photorealistic',
            'HDR Natural Lighting',
            'True-to-Life Realistic Portrait',
            'Real Documentary Style',
            'Analog Film Realism',
            'Vintage Film Grain 35mm',
            'Nature Wildlife Realism',
            'Aerial Drone Realistic',
            'Macro Lens Ultra Detail',
            'Realistic Depth-of-Field (Bokeh)',
            'Natural Ambient Lighting Realism',
            'Realistic Street Photography Look',
            'National Geographic Nature Style',
            'Realistic Travel Cinematic Vlog',
            'Golden Hour Cinematic Warm Tone',
            'Night Realism with Soft Lighting',
            'Realistic Commercial Advertising Look',
            'High-Contrast Moody Realistic Style'
        ]
    },
    {
        label: "🎨 Anime Styles",
        options: [
            'Lofi Anime',
            'Studio Ghibli Aesthetic',
            'Makoto Shinkai Style',
            'Demon Slayer Style',
            'Attack on Titan Epic Style',
            'Naruto Shonen Style',
            'One Piece Adventure Style',
            'Cyberpunk Anime Neon',
            'Romantic Shojo Soft Light',
            'Retro 90s Anime',
            'Anime Chibi Cute Style',
            'Fantasy Magic Anime',
            'Samurai Edo Style',
            'Anime Action Dynamic Motion',
            'Slice of Life Cozy Anime',
            'Dark Horror Anime',
            'Sports Anime Dynamic',
            'Space Sci-Fi Anime',
            'Anime Mecha Gundam Style'
        ]
    },
    {
        label: "🧊 3D Render Styles",
        options: [
            'Cozy 3D Render',
            'Pixar Style 3D',
            'Disney 3D Animation',
            'DreamWorks 3D Look',
            'Hyper-Realistic 3D',
            'Claymation 3D',
            'Miniature Toy Stop-Motion Style',
            'Plastic Figurine Style',
            '3D Cartoon Stylized',
            '3D Fantasy Environment',
            '3D Futuristic Sci-Fi Render',
            'Unreal Engine Cinematic',
            'Blender Cycles Render',
            '3D Low-Poly Cartoon',
            'Voxel Minecraft-Style',
            '3D Abstract Neon Glass',
            '3D Architectural Realistic',
            '3D Game Character Realism',
            '3D Soft Pastel Render'
        ]
    },
    {
        label: "🖌 Watercolor / Art Styles",
        options: [
            'Soft Watercolor Pastel',
            'Wet-on-Wet Watercolor Landscape',
            'Ink & Wash Traditional Asian Art',
            'Japanese Sumi-e Brush',
            'Chinese Ink Mountain Art',
            'Oil Painting Realistic',
            'Impressionist Claude Monet Style',
            'Van Gogh Brush Stroke Style',
            'Gouache Illustration',
            'Sketch + Watercolor Mix',
            'Children Storybook Watercolor',
            'Vintage Botanical Painting',
            'Pencil & Ink Hand-Drawn',
            'Charcoal Shading Art',
            'Acrylic Canvas Painting',
            'Minimalist Line Art with wash',
            'Fantasy Watercolor Dreamscape',
            'Watercolor Portrait Soft Skin',
            'Surreal Watercolor Abstract'
        ]
    },
    {
        label: "🇰🇭 Khmer Cultural Themes",
        options: [
            'Angkor Wat Sunrise Cinematic',
            'Bayon Temple Stone Faces Mystical',
            'Banteay Srei Pink Sandstone Texture',
            'Traditional Khmer Wedding Golden',
            'Apsara Classical Dance Elegant',
            'Khmer Countryside Sunset Rice Fields',
            'Ox Cart Rural Village Life',
            'Floating Village Tonle Sap Boat Life',
            'Cambodian Pagoda Buddhist Architecture',
            'Monks Walking Morning Alms',
            'Khmer Silk Weaving Workshop',
            'Battambang Bamboo Train Ride',
            'Phnom Penh Riverside Night Lights',
            'Khmer Wooden House Lifestyle',
            'Royal Palace Gold Roof Details',
            'Kampot Pepper Farm Green Mountain',
            'Koh Rong Tropical Island Paradise',
            'Siem Reap Night Market Lights',
            'Khmer Traditional Food Cooking Rustic'
        ]
    }
];

const ratioOptions = [{ label: '16:9', value: '16:9' }, { label: '9:16', value: '9:16' }];

interface ThemeTemplate {
    name: string;
    camera: string;
    shot: string;
    style: string;
    vibe: string;
}

const natureThemes: ThemeTemplate[] = [
    { name: 'Calm Ocean Waves — ផ្ទៃខ្សាច់ ស្ងប់ស្ងាត់', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Peaceful ocean waves hitting sandy beach, blue hues, golden hour, quiet atmosphere' },
    { name: 'Forest Morning — ពន្លឺព្រះអាទិត្យ និងសត្វច្រៀង', camera: 'Pan Right', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Sunrise in forest, sun beams through leaves, birds chirping, fresh morning' },
    { name: 'Mountain Cloud Sunset — ពពកហើរលេងលើភ្នំ', camera: 'Top Shot / Bird’s Eye View', shot: 'Extreme Wide Shot (EWS)', style: 'Cinematic Realism', vibe: 'Clouds flowing over mountains, golden yellow sunset, majestic view' },
    { name: 'Waterfall Paradise — ទឹកធ្លាក់ធំៗ', camera: 'Tilt Up', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Massive waterfall, mist, fresh air, nature sound' },
    { name: 'Tropical Beach Night — ខ្យល់សមុទ្ររាត្រី', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Night beach, moonlight reflection, sound of waves, palm trees' },
    { name: 'Lotus Lake Sunrise — បឹងឈូកព្រឹកព្រលឹម', camera: 'Orbit / Arc Shot', shot: 'Close-Up (CU)', style: 'Watercolor', vibe: 'Pink lotus blooming, morning mist, gentle sunrise light, serene' },
    { name: 'Underwater Blue World — ពិភពក្រោមទឹក', camera: 'Truck / Track Right', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Fish swimming, light rays entering from above, deep blue ocean' },
    { name: 'Himalaya Peace Valley — ជ្រលងភ្នំសន្តិភាព', camera: 'Top Shot / Bird’s Eye View', shot: 'Extreme Wide Shot (EWS)', style: 'Cinematic Realism', vibe: 'Huge lake, mountains, clouds below, peace' },
    { name: 'Golden Rice Field Sunset — វាលស្រែពណ៌មាស', camera: 'Pan Right', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Golden rice field swaying, sunset, peaceful countryside' },
    { name: 'Lavender Garden Wind — សួនផ្កាឡាវែនឌ័រ', camera: 'Dolly In', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Lavender field, gentle wind, purple colors, soothing' },
    { name: 'Silent Lake With Light Mist — បឹងស្ងប់មានអ័ព្ទ', camera: 'Pan Right', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Fog moving slowly over calm lake, mysterious, quiet' },
    { name: 'Relaxing Bamboo Forest — ព្រៃឫស្សី', camera: 'Tilt Up', shot: 'Low Angle Shot', style: 'Cinematic Realism', vibe: 'Bamboo swaying, wind sound, green, zen' },
    { name: 'Slow Flowing River Stones — ទឹកហូរលើថ្ម', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Clear water flowing over smooth stones, meditative sound' },
    { name: 'Birds Flying Across Sunset — សត្វស្លាបហើរ', camera: 'Pan Right', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Silhouette of birds flying, slow motion, sunset horizon' },
    { name: 'Slow Clouds Over Blue Canyon — ពពកលើជ្រលងភ្នំ', camera: 'Top Shot / Bird’s Eye View', shot: 'Extreme Wide Shot (EWS)', style: 'Cinematic Realism', vibe: 'Blue canyon landscape, slow moving clouds, vastness' },
];

const weatherThemes: ThemeTemplate[] = [
    { name: 'Rain & Thunder — ភ្លៀងធ្លាក់ និងផ្គរលាន់', camera: 'Static (No Movement)', shot: 'Medium Shot (MS)', style: 'Cinematic Realism', vibe: 'Rain on roof, soft thunder, warm cozy feeling, dark sky' },
    { name: 'White Snow Winter — ព្រិលធ្លាក់រដូវរងា', camera: 'Dolly Out', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Soft snow falling, cold wind, white landscape, winter silence' },
    { name: 'Quiet Library Study — បណ្ណាល័យស្ងប់ស្ងាត់', camera: 'Dolly In', shot: 'Medium Shot (MS)', style: 'Cinematic Realism', vibe: 'Books, quiet study atmosphere, soft air conditioner sound' },
    { name: 'Rain on Window at Night — ភ្លៀងលើកញ្ចក់', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Lofi Anime', vibe: 'Raindrops on glass, city bokeh lights, melancholic night' },
    { name: 'Vintage Film Home — ផ្ទះបែបបុរាណ', camera: 'Static (No Movement)', shot: 'Medium Shot (MS)', style: 'Cinematic Realism', vibe: 'Warm home ambience, film grain, golden tone, nostalgic' },
    { name: 'Crackling Fireplace — ចង្ក្រានភ្លើង', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cozy 3D Render', vibe: 'Fire burning, logs, warm orange glow, comfort' },
    { name: 'Peaceful Rain on Lotus Leaves — ភ្លៀងលើស្លឹកឈូក', camera: 'Static (No Movement)', shot: 'Extreme Close-Up (ECU)', style: 'Cinematic Realism', vibe: 'Raindrop hitting lotus leaf, nature sounds, fresh' },
    { name: 'Relaxing Beach Hammock — ដេកអង្រឹងមាត់សមុទ្រ', camera: 'Point of View (POV)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'View from hammock, beach, relaxing, vacation mode' },
];

const spiritualThemes: ThemeTemplate[] = [
    { name: 'Zen Japanese Garden — សួនច្បារជប៉ុន', camera: 'Truck / Track Right', shot: 'Medium Shot (MS)', style: 'Cinematic Realism', vibe: 'Small waterfall, sand raking, lotus, peaceful zen' },
    { name: 'Temple & Buddhist Bells — វត្តអារាម', camera: 'Pan Left', shot: 'Medium Shot (MS)', style: 'Cinematic Realism', vibe: 'Ancient architecture, sunlight reflecting, peaceful, spiritual bells' },
    { name: 'Tea Pouring Ceremony — ពិធីចាក់តែ', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Pouring tea from copper pot, steam, zen style' },
    { name: 'Monk Walking Peacefully — ព្រះសង្ឃដើរ', camera: 'Truck / Track Right', shot: 'Profile Shot', style: 'Cinematic Realism', vibe: 'Orange robes, walking in temple corridor, peaceful footsteps' },
    { name: 'Temple Candle Meditation — ទៀនក្នុងវត្ត', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Candle flame flickering, warm light, meditation room' },
];

const sleepThemes: ThemeTemplate[] = [
    { name: 'Moonlit Silent Waves — យប់ស្ងាត់មាត់សមុទ្រ', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Moonlight on gentle waves, deep blue, quiet, sleep aid' },
    { name: 'Quiet Snow Garden Night — សួនព្រិលពេលយប់', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Silent snow falling in garden, night time, peaceful cold' },
    { name: 'Baby Angel Cloud Dream — សុបិនកុមារតូច', camera: 'Slow Pan', shot: 'Medium Shot (MS)', style: 'Cozy 3D Render', vibe: 'Soft pastel clouds, sleeping baby angel, dreamlike, fluffy' },
    { name: 'Soft Night Lantern Light — ពន្លឺចង្កៀងយប់', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cozy 3D Render', vibe: 'Warm lantern light, soft shadows, cozy atmosphere' },
    { name: 'Deep Forest Night Crickets — ចចកព្រៃនៅរាត្រី', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Dark forest, moonlight beams, cricket sounds, nature night' },
    { name: 'Moon Over Silent Mountains — ព្រះចន្ទលើភ្នំ', camera: 'Static (No Movement)', shot: 'Extreme Wide Shot (EWS)', style: 'Cinematic Realism', vibe: 'Full moon rising over mountains, silent night, majestic' },
    { name: 'Milky Way Galaxy Calm — ផ្លូវដេលខេត', camera: 'Static (No Movement)', shot: 'Extreme Wide Shot (EWS)', style: 'Cinematic Realism', vibe: 'Milky way stars, slow movement, universe, deep sleep' },
    { name: 'Cozy Bed Warm Candle — ភ្លើងទៀនកក់ក្ដៅ', camera: 'Static (No Movement)', shot: 'Medium Shot (MS)', style: 'Cozy 3D Render', vibe: 'Comfy bed, warm candle light, soft blankets, safe' },
    { name: 'Silent Lake Silver Reflection — ពន្លឺប្រាក់លើបឹង', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Silver moonlight reflection on still lake, mirror effect' },
    { name: 'Baby Sleep White Noise Fan — ម៉ាស៊ីន VENT', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cozy 3D Render', vibe: 'Soft fan spinning, nursery room, pastel colors, white noise visual' },
    { name: 'Soft Bedroom Night Light — បន្ទប់គេងស្ងប់', camera: 'Static (No Movement)', shot: 'Medium Shot (MS)', style: 'Cozy 3D Render', vibe: 'Warm yellow lamp light, bed, sleep, night time' },
    { name: 'Baby Sleeping Stars — កូនក្មេងគេង', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cozy 3D Render', vibe: 'Pastel colors, mobile toy rotating, soft stars, lullaby' },
    { name: 'Galaxy Dream Nebula — យល់សប្តិអវកាស', camera: 'Zoom In', shot: 'Wide Shot (WS)', style: 'Abstract 3D', vibe: 'Fantasy stars, nebula colors, sleep visual, dream' },
];

const focusThemes: ThemeTemplate[] = [
    { name: 'Foggy Riverside Reading — អានសៀវភៅជាប់ទន្លេ', camera: 'Static (No Movement)', shot: 'Medium Shot (MS)', style: 'Lofi Anime', vibe: 'Person reading by river, foggy morning, quiet, study' },
    { name: 'Minimal Desk Sunrise — តុធ្វើការថ្ងៃរះ', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Clean desk setup, sunrise light hitting surface, productivity' },
    { name: 'Quiet Train Cabin — ធ្វើការក្នុងរថភ្លើង', camera: 'Static (No Movement)', shot: 'Medium Shot (MS)', style: 'Lofi Anime', vibe: 'Train window view, passing landscape, quiet cabin, focus' },
    { name: 'Deep Focus Rain on Glass — ភ្លៀងលើកញ្ចក់', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Heavy rain on window, blurred city background, intense focus' },
    { name: 'Night Writing Warm Desk — តុសរសេរយប់', camera: 'Static (No Movement)', shot: 'Medium Shot (MS)', style: 'Cozy 3D Render', vibe: 'Lamp light on desk, notebook, night time, creative writing' },
    { name: 'Forest Cabin Creative — បន្ទប់ស៊ុមឈើ', camera: 'Pan Right', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Wooden cabin interior, forest view window, inspiring' },
    { name: 'Mountain View Laptop — ធ្វើការមើលភ្នំ', camera: 'Static (No Movement)', shot: 'Over-the-Shoulder Shot (OTS)', style: 'Cinematic Realism', vibe: 'Working on laptop, balcony view of mountains, fresh air' },
    { name: 'Ocean Breeze Study — បន្ទប់មើលសមុទ្រ', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Lofi Anime', vibe: 'Open window, curtains blowing, ocean view, study room' },
    { name: 'Peaceful Park Bench — អានសៀវភៅលើកៅអីសួន', camera: 'Static (No Movement)', shot: 'Medium Shot (MS)', style: 'Cinematic Realism', vibe: 'Park bench under tree, sunlight filtering, reading, quiet' },
    { name: 'Coffee Shop Typewriter — កាហ្វេនិងម៉ាស៊ីនអង្គុលី', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Vintage typewriter, coffee cup, cafe ambience, writing' },
];

const yogaThemes: ThemeTemplate[] = [
    { name: 'Golden Sunrise Beach Yoga — យោគាឆ្នេរខ្សាច់', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Yoga silhouette on beach, golden sunrise, calm ocean' },
    { name: 'Meditation Waterfall Calm — សមាធិទឹកជ្រោះ', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Person meditating near waterfall, nature sounds, mist' },
    { name: 'Himalayan Wind Flags — ទង់អធិស្ឋាន', camera: 'Static (No Movement)', shot: 'Medium Shot (MS)', style: 'Cinematic Realism', vibe: 'Prayer flags blowing in wind, snowy mountains background, peace' },
    { name: 'Lotus Spirit Garden — សួនផ្កាអប្សរ', camera: 'Orbit / Arc Shot', shot: 'Medium Shot (MS)', style: 'Fantasy Landscape', vibe: 'Glowing lotus garden, spiritual atmosphere, magic particles' },
    { name: 'Zen Candle Blue Room — បន្ទប់ទៀន Zen', camera: 'Static (No Movement)', shot: 'Medium Shot (MS)', style: 'Cinematic Realism', vibe: 'Blue ambient light, candle flame, zen meditation room' },
    { name: 'Floating Clouds Path — ផ្លូវសមាធិលើពពក', camera: 'Dolly In', shot: 'Wide Shot (WS)', style: 'Abstract 3D', vibe: 'Path walking on clouds, sky high, heavenly, peaceful' },
    { name: 'Crystal Bowl Healing — ថាសគ្រីស្តាល់', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Crystal singing bowls, sound healing setup, bright airy room' },
    { name: 'Moon Energy Lake — សមាធិព្រះចន្ទ', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Full moon reflection on lake, person meditating, night energy' },
    { name: 'Sacred Temple Bell — កណ្តឹងវត្ត', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Bronze temple bell, vibration, spiritual connection' },
    { name: 'Mystic Bamboo Forest — ព្រៃឫស្សី', camera: 'Pan Left', shot: 'Low Angle Shot', style: 'Cinematic Realism', vibe: 'Tall bamboo forest, mist, wind sound, mysterious calm' },
    { name: 'Galaxy & Stars Meditation — សមាធិក្រោមផ្កាយ', camera: 'Zoom In', shot: 'Wide Shot (WS)', style: 'Abstract 3D', vibe: 'Deep space, shining stars surrounding, meditation, infinite' },
    { name: 'Yoga on Hilltop Clouds — យូហ្គាលើភ្នំ', camera: 'Orbit / Arc Shot', shot: 'Medium Shot (MS)', style: 'Cinematic Realism', vibe: 'Yoga pose, clouds background, peace, morning' },
];

const khmerThemes: ThemeTemplate[] = [
    { name: 'Angkor Sunrise Golden — ថ្ងៃរះអង្គរវត្ត', camera: 'Pan Right', shot: 'Wide Shot (WS)', style: 'Angkor Wat Sunrise Cinematic', vibe: 'Golden sunrise over Angkor Wat towers, reflection in pond, majestic' },
    { name: 'Bayon Smile Morning — មុខញញឹមបាយ័ន', camera: 'Slow Pan', shot: 'Close-Up (CU)', style: 'Bayon Temple Stone Faces Mystical', vibe: 'Stone faces of Bayon temple, soft morning light, ancient peace' },
    { name: 'Ta Prohm Jungle — ព្រៃអ័ព្ទតាព្រហ្ម', camera: 'Dolly In', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Giant tree roots covering temple stones, jungle mist, mysterious' },
    { name: 'Monks Walking Robes — ព្រះសង្ឃដើរ', camera: 'Truck / Track Right', shot: 'Medium Wide Shot (MWS)', style: 'Monks Walking Morning Alms', vibe: 'Line of monks in orange robes, morning alms, peaceful village' },
    { name: 'Apsara Silk Dance — របាំអប្សរា', camera: 'Static (No Movement)', shot: 'Full Shot (FS)', style: 'Apsara Classical Dance Elegant', vibe: 'Apsara dancer in slow motion, silk costume, elegant movements' },
    { name: 'Khmer Village Buffalo — ស្តេចគោថ្ងៃលិច', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Khmer Countryside Sunset Rice Fields', vibe: 'Water buffalo in rice field, sunset, rural Cambodia life' },
    { name: 'Countryside Rice Wind — ខ្យល់វាលស្រែ', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Khmer Countryside Sunset Rice Fields', vibe: 'Green rice fields waving in wind, palm trees, fresh air' },
    { name: 'Traditional Market — ផ្សារព្រឹក', camera: 'Pan Left', shot: 'Medium Shot (MS)', style: 'Cinematic Realism', vibe: 'Busy traditional market, colorful fruits and vegetables, morning life' },
    { name: 'Tonle Sap Floating — ភូមិលើទឹក', camera: 'Dolly Out', shot: 'Wide Shot (WS)', style: 'Floating Village Tonle Sap Boat Life', vibe: 'Floating houses on lake, boat moving slowly, sunrise' },
    { name: 'Kulen Mountain Mist — ទឹកបរិសុទ្ធភ្នំពូលេន', camera: 'Tilt Up', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Waterfall on Kulen mountain, holy water, mist, nature' },
    { name: 'Royal Palace Night — ព្រះបរមរាជវាំងយប់', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Royal Palace Gold Roof Details', vibe: 'Royal Palace illuminated at night, reflection in river, gold' },
    { name: 'Phnom Penh Riverside — មាត់ទន្លេភ្នំពេញ', camera: 'Pan Right', shot: 'Wide Shot (WS)', style: 'Phnom Penh Riverside Night Lights', vibe: 'Calm riverside at evening, city lights, gentle breeze' },
    { name: 'Ox Cart Palm Fields — រទេះគោដើមត្នោត', camera: 'Truck / Track Left', shot: 'Medium Wide Shot (MWS)', style: 'Ox Cart Rural Village Life', vibe: 'Ox cart moving on dirt road, sugar palm trees, rural life' },
    { name: 'Lotus Farm Wind — ផ្កាលូតូស', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Lotus farm, pink flowers swaying, soft wind, nature' },
    { name: 'Salt Field Sparkle — វាលអំបិល', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Kampot salt fields reflecting sun, sparkling white, morning' },
    { name: 'Chamkar Pepper Rain — ចម្ការម្រេច', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Kampot Pepper Farm Green Mountain', vibe: 'Green pepper vines, rain falling, fresh green, farm' },
    { name: 'Fishing Boat Misty — ទូកនេសាទ', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Small fishing boat on misty river, early morning, silence' },
    { name: 'Ancient Pagoda Light — ពន្លឺលើវត្ត', camera: 'Static (No Movement)', shot: 'Low Angle Shot', style: 'Cambodian Pagoda Buddhist Architecture', vibe: 'Sunlight hitting pagoda roof, gold details, spiritual' },
    { name: 'Rattan Weaving — ត្បាញ', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Cinematic Realism', vibe: 'Hands weaving rattan basket, traditional craft, detailed' },
    { name: 'Silk Loom Rhythm — ត្បាញសូត្រ', camera: 'Static (No Movement)', shot: 'Close-Up (CU)', style: 'Khmer Silk Weaving Workshop', vibe: 'Traditional silk loom working, rhythmic motion, colorful silk' },
    { name: 'Calm Khmer Countryside — ជនបទខ្មែរ', camera: 'Top Shot / Bird’s Eye View', shot: 'Wide Shot (WS)', style: 'Cinematic Realism', vibe: 'Morning fog, rice fields, palm trees, traditional village' },
];

const fantasyThemes: ThemeTemplate[] = [
    { name: 'Floating Clouds Time-lapse — ពពកហើរ', camera: 'Static (No Movement)', shot: 'Extreme Wide Shot (EWS)', style: 'Studio Ghibli Aesthetic', vibe: 'Clouds moving slowly, blue sky, bright, timelapse' },
    { name: 'Floating Paper Lanterns — គោមក្រដាសលើទឹក', camera: 'Orbit / Arc Shot', shot: 'Wide Shot (WS)', style: 'Fantasy Landscape', vibe: 'Orange lanterns floating on river, night, magical' },
    { name: 'Peaceful Procreate Animation — គំនូរជីវចល', camera: 'Static (No Movement)', shot: 'Wide Shot (WS)', style: 'Watercolor', vibe: 'Pastel background, fantasy drawing style, soft animation' },
    { name: 'Fireflies in Dark Forest — អំពិលអំពែក', camera: 'Dolly In', shot: 'Wide Shot (WS)', style: 'Fantasy Landscape', vibe: 'Dark forest, grass, glowing fireflies, magical night' },
    { name: 'Crystal Cave — រូងគ្រីស្តាល់', camera: 'Dolly In', shot: 'Wide Shot (WS)', style: 'Fantasy Landscape', vibe: 'Glowing crystals, magical, echo, purple and blue' },
];

const allThemes = [
    ...sleepThemes,
    ...focusThemes,
    ...yogaThemes,
    ...khmerThemes,
    ...natureThemes,
    ...weatherThemes,
    ...spiritualThemes,
    ...fantasyThemes
];

const RelaxingMusicGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [camera, setCamera] = useState(cameraOptions[0]);
    const [shot, setShot] = useState(shotOptions[1]); // Default to Wide Shot
    const [segments, setSegments] = useState(8);
    const [duration, setDuration] = useState(64);
    // Initialize with first style of first group
    const [style, setStyle] = useState(styleGroups[0].options[0]);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [vibe, setVibe] = useState('Focused, productive');
    const [selectedTheme, setSelectedTheme] = useState<string>(allThemes[0].name);
    
    // Auto Smart Thinking States
    const [autoCamera, setAutoCamera] = useState(false);
    const [autoShot, setAutoShot] = useState(false);
    const [autoMusic, setAutoMusic] = useState(false);
    
    // Mode Switching State
    const [mode, setMode] = useState<'wizard' | 'custom'>('wizard');
    const [customPrompt, setCustomPrompt] = useState('');
    
    const [result, setResult] = useState<RelaxingPromptsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [copiedMusic, setCopiedMusic] = useState(false);
    
    const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const handleGenerate = useCallback(async () => {
        if (mode === 'custom' && !customPrompt.trim()) {
            setError('Please enter a custom prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const data = await generateRelaxingPrompts({
                camera: autoCamera ? "Auto: Cinematic Dynamic" : camera,
                shot: autoShot ? "Auto: Mixed Variety" : shot,
                segments,
                duration,
                style,
                aspectRatio,
                vibe,
                useSmartMusic: autoMusic,
                customPrompt: mode === 'custom' ? customPrompt : undefined
            });
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed');
        } finally {
            setIsLoading(false);
        }
    }, [camera, shot, segments, duration, style, aspectRatio, vibe, autoCamera, autoShot, autoMusic, mode, customPrompt]);

    const handleApplyTheme = () => {
        const theme = allThemes.find(t => t.name === selectedTheme);
        if (theme) {
            setCamera(theme.camera);
            setShot(theme.shot);
            setStyle(theme.style);
            setVibe(theme.vibe);
            // Reset Auto flags when applying a specific theme to respect the theme's settings
            setAutoCamera(false);
            setAutoShot(false);
        }
    };

    const handleCopy = (text: string, index?: number) => {
        navigator.clipboard.writeText(text);
        if (index !== undefined) {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } else {
            setCopiedMusic(true);
            setTimeout(() => setCopiedMusic(false), 2000);
        }
    };

    const handleGeneratePreview = async (prompt: string) => {
        setIsPreviewLoading(true);
        if (previewVideoUrl) URL.revokeObjectURL(previewVideoUrl);
        setPreviewVideoUrl(null);
        try {
            const blob = await generateVideo({ prompt, aspectRatio });
            setPreviewVideoUrl(URL.createObjectURL(blob));
        } catch (err) {
            alert('Preview generation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleClear = () => {
        setResult(null);
        setError(null);
        setVibe('Focused, productive');
        if (previewVideoUrl) URL.revokeObjectURL(previewVideoUrl);
        setPreviewVideoUrl(null);
        setSelectedTheme(allThemes[0].name);
        setAutoCamera(false);
        setAutoShot(false);
        setAutoMusic(false);
        setCustomPrompt('');
    };

    const inputClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 placeholder-gray-400 disabled:opacity-50";

    return (
        <div className="w-full max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Controls */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 h-fit sticky top-4">
                    <ClearProjectButton onClick={handleClear} />
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-4">
                        Relaxing Music Video
                    </h2>

                    {/* Mode Switcher */}
                    <div className="flex items-center bg-gray-900 p-1 rounded-lg border border-gray-700 mb-4">
                        <button 
                            onClick={() => setMode('wizard')}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition ${mode === 'wizard' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Wizard Mode
                        </button>
                        <button 
                            onClick={() => setMode('custom')}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition ${mode === 'custom' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Custom Prompt
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Custom Prompt Mode */}
                        {mode === 'custom' ? (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-semibold mb-2 text-gray-300">Your Idea / Description</label>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="e.g., A journey through a magical bioluminescent forest at night, seeing glowing mushrooms and fairies..."
                                    className={`${inputClasses} h-48 resize-y`}
                                />
                                <p className="text-xs text-gray-500 mt-2">The AI will analyze your text and generate the video segments and music prompt automatically.</p>
                            </div>
                        ) : (
                            /* Wizard Mode */
                            <div className="animate-fade-in space-y-4">
                                {/* Theme Selector */}
                                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 mb-4">
                                    <label className="block text-sm font-semibold mb-2 text-yellow-400">🎨 ជ្រើសរើសធីម (Theme)</label>
                                    <div className="flex gap-2">
                                        <select 
                                            value={selectedTheme} 
                                            onChange={(e) => setSelectedTheme(e.target.value)} 
                                            className={`${inputClasses} flex-grow`}
                                        >
                                            <optgroup label="🌙 Sleeping / Deep Sleep / Baby Relax">
                                                {sleepThemes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                            </optgroup>
                                            <optgroup label="🎧 Focus / Study / Productivity">
                                                {focusThemes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                            </optgroup>
                                            <optgroup label="🧘 Yoga / Meditation / Healing">
                                                {yogaThemes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                            </optgroup>
                                            <optgroup label="🇰🇭 Cambodia / Khmer Culture">
                                                {khmerThemes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                            </optgroup>
                                            <optgroup label="🌊 Nature & Scenery">
                                                {natureThemes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                            </optgroup>
                                            <optgroup label="🌧️ Weather & Ambience">
                                                {weatherThemes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                            </optgroup>
                                            <optgroup label="🏯 Spiritual & Cultural">
                                                {spiritualThemes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                            </optgroup>
                                            <optgroup label="✨ Fantasy & Abstract">
                                                {fantasyThemes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                            </optgroup>
                                        </select>
                                        <button 
                                            onClick={handleApplyTheme}
                                            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold rounded-lg transition"
                                        >
                                            អនុវត្ត
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold text-gray-300">Camera Movement</label>
                                        <label className="flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={autoCamera} 
                                                onChange={(e) => setAutoCamera(e.target.checked)} 
                                                className="w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 rounded focus:ring-emerald-600"
                                            />
                                            <span className="ml-2 text-xs text-emerald-400 font-medium">Smart Auto</span>
                                        </label>
                                    </div>
                                    <select value={camera} onChange={(e) => setCamera(e.target.value)} className={inputClasses} disabled={autoCamera}>
                                        {cameraOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold text-gray-300">Shot Type</label>
                                        <label className="flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={autoShot} 
                                                onChange={(e) => setAutoShot(e.target.checked)} 
                                                className="w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 rounded focus:ring-emerald-600"
                                            />
                                            <span className="ml-2 text-xs text-emerald-400 font-medium">Smart Auto</span>
                                        </label>
                                    </div>
                                    <select value={shot} onChange={(e) => setShot(e.target.value)} className={inputClasses} disabled={autoShot}>
                                        {shotOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2 text-gray-300">Style</label>
                                        <select value={style} onChange={(e) => setStyle(e.target.value)} className={inputClasses}>
                                            {styleGroups.map((group) => (
                                                <optgroup key={group.label} label={group.label}>
                                                    {group.options.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-2">Vibe</label>
                                        <input type="text" value={vibe} onChange={(e) => setVibe(e.target.value)} className={inputClasses} placeholder="e.g., Calm, Rainy, Cozy" />
                                    </div>
                                </div>
                                
                                <div>
                                     <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold text-gray-300">Smart Music</label>
                                         <label className="flex items-center cursor-pointer" title="AI will create a perfect matching music prompt for the video">
                                            <input 
                                                type="checkbox" 
                                                checked={autoMusic} 
                                                onChange={(e) => setAutoMusic(e.target.checked)} 
                                                className="w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 rounded focus:ring-emerald-600"
                                            />
                                            <span className="ml-2 text-xs text-emerald-400 font-medium">Auto-Match Vibe</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Common Settings for Both Modes */}
                        <div className="pt-4 border-t border-gray-700 grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs font-semibold mb-1 text-gray-400">Segments</label>
                                <input type="number" min="1" max="20" value={segments} onChange={(e) => setSegments(parseInt(e.target.value) || 1)} className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1 text-gray-400">Duration (s)</label>
                                <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 64)} className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1 text-gray-400">Ratio</label>
                                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className={inputClasses}>
                                    {ratioOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading} 
                            className="w-full flex items-center justify-center px-4 py-3 font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-lg hover:from-emerald-500 hover:to-teal-500 transition-all active:scale-95 disabled:opacity-50 mt-4"
                        >
                            {isLoading ? <Spinner /> : 'Generate Prompts'}
                        </button>
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded text-sm">{error}</div>}
                </div>
            </div>

            {/* Right Panel: Results */}
            <div className="lg:col-span-2 space-y-6">
                {result ? (
                    <>
                        {/* Music Prompt Section */}
                        <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold text-teal-400">🎵 Music Prompt <span className="text-xs text-gray-500 font-normal ml-2">(Max 200 chars)</span></h3>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-mono ${result.musicPrompt.length > 200 ? 'text-red-400' : 'text-gray-500'}`}>
                                        {result.musicPrompt.length}/200
                                    </span>
                                    <button onClick={() => handleCopy(result.musicPrompt)} className="flex items-center gap-2 text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-white transition">
                                        <CopyIcon /> {copiedMusic ? 'Copied!' : 'Copy for Suno'}
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-300 bg-gray-900 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap border border-gray-800">{result.musicPrompt}</p>
                        </div>

                        {/* Video Segments */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-teal-400 px-1">📹 Video Segments</h3>
                            {result.videoSegments.map((seg, index) => (
                                <div key={index} className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-emerald-500/50 transition group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Segment {seg.segmentNumber}</span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleGeneratePreview(seg.prompt)} 
                                                disabled={isPreviewLoading}
                                                className="text-[10px] bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-900 border border-emerald-800 transition disabled:opacity-50"
                                                title="Generate a video preview of this segment"
                                            >
                                                {isPreviewLoading ? 'Generating...' : '▶ Preview'}
                                            </button>
                                            <button 
                                                onClick={() => handleCopy(seg.prompt, index)} 
                                                className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-600 transition"
                                            >
                                                {copiedIndex === index ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-gray-200 text-sm leading-relaxed">{seg.prompt}</p>
                                </div>
                            ))}
                        </div>
                        
                        {previewVideoUrl && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => { if(previewVideoUrl) URL.revokeObjectURL(previewVideoUrl); setPreviewVideoUrl(null); }}>
                                <div className="bg-gray-900 p-4 rounded-lg max-w-3xl w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between mb-2">
                                        <h3 className="text-white font-bold">Preview</h3>
                                        <button onClick={() => { if(previewVideoUrl) URL.revokeObjectURL(previewVideoUrl); setPreviewVideoUrl(null); }} className="text-gray-400 hover:text-white">✕</button>
                                    </div>
                                    <VideoPanel title="Segment Preview" videoUrl={previewVideoUrl} isLoading={false} />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-gray-800/30 border-2 border-dashed border-gray-700 rounded-xl h-64 flex flex-col items-center justify-center text-gray-500">
                        <span className="text-4xl mb-4">🎹</span>
                        <p>Configure and generate your relaxing music prompts.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RelaxingMusicGenerator;
