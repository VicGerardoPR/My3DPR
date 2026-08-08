import { Category, Product, BoxTemplate, Coupon, Review } from '@/types';

export const DEMO_CATEGORIES: Category[] = [
  {
    id: 'cat-articulados',
    name_es: 'Articulados & Flexibles',
    name_en: 'Articulated & Flexi',
    slug: 'articulados',
    description_es: 'Dragones, criaturas y juguetes impresos en 3D sin ensamblaje.',
    description_en: '3D printed dragons, creatures, and toys with zero assembly needed.',
    image_url: '/images/dragon.jpg',
    sort_order: 1,
    active: true,
  },
  {
    id: 'cat-gaming',
    name_es: 'Gaming & Setup',
    name_en: 'Gaming & Setup',
    slug: 'gaming',
    description_es: 'Soportes de controles, organizadores de cables y accesorios de escritorio.',
    description_en: 'Controller stands, cable organizers, and desk gear.',
    image_url: '/images/mech.jpg',
    sort_order: 2,
    active: true,
  },
  {
    id: 'cat-decor',
    name_es: 'Decoración del Hogar',
    name_en: 'Home Decor',
    slug: 'decoracion',
    description_es: 'Macetas geométricas, litofanías y lámparas 3D exclusivas.',
    description_en: 'Geometric planters, lithophanes, and exclusive 3D lamps.',
    image_url: '/images/planter.jpg',
    sort_order: 3,
    active: true,
  },
  {
    id: 'cat-llaveros',
    name_es: 'Llaveros & Minis',
    name_en: 'Keychains & Minis',
    slug: 'llaveros',
    description_es: 'Llaveros personalizados, dijes y coleccionables en miniatura.',
    description_en: 'Personalized keychains, charms, and miniature collectibles.',
    image_url: '/images/keychains.jpg',
    sort_order: 4,
    active: true,
  },
  {
    id: 'cat-personalizados',
    name_es: 'Personalizados',
    name_en: 'Custom Prints',
    slug: 'personalizados',
    description_es: 'Productos grabados con nombres, fechas y diseños custom.',
    description_en: 'Products engraved with names, dates, and custom designs.',
    image_url: '/images/lithophane.jpg',
    sort_order: 5,
    active: true,
  },
  {
    id: 'cat-anime',
    name_es: 'Anime & Figuras',
    name_en: 'Anime & Figures',
    slug: 'anime',
    description_es: 'Figuras detalladas, bustos y accesorios de tus series favoritas.',
    description_en: 'Detailed figures, busts, and accessories from your favorite series.',
    image_url: '/images/axolotl.jpg',
    sort_order: 6,
    active: true,
  },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'prod-dragon-crystal',
    name_es: 'Dragón de Cristal Articulado (35cm)',
    name_en: 'Articulated Crystal Dragon (35cm)',
    slug: 'dragon-cristal-articulado',
    sku: 'MY3D-DRG-001',
    description_es: 'Impreso en PLA seda multicolor de máxima brillantez. Articulación fluida de cabeza a cola con escamas estilo cristal de alta definición.',
    description_en: 'Printed in rainbow silk PLA. Fluid movement from head to tail with detailed crystal scales.',
    price: 24.99,
    sale_price: 19.99,
    category_id: 'cat-articulados',
    status: 'READY_TO_SHIP',
    is_customizable: true,
    is_featured: true,
    is_new: true,
    is_best_seller: true,
    material: 'Silk Rainbow PLA',
    weight_grams: 180,
    dimensions_cm: '35 x 8 x 6',
    lead_time_days: 1,
    rating: 4.9,
    review_count: 38,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    images: [
      { id: 'img-1', product_id: 'prod-dragon-crystal', url: '/images/dragon.jpg', alt_text: 'Crystal Dragon Front', sort_order: 0, is_primary: true },
      { id: 'img-2', product_id: 'prod-dragon-crystal', url: '/images/axolotl.jpg', alt_text: 'Flexi Articulation', sort_order: 1, is_primary: false }
    ],
    variants: [
      { id: 'var-1', product_id: 'prod-dragon-crystal', sku: 'MY3D-DRG-001-CYAN', size: 'Grande (35cm)', color: 'Turquesa Arcoíris', material: 'Silk PLA', stock_quantity: 12, active: true },
      { id: 'var-2', product_id: 'prod-dragon-crystal', sku: 'MY3D-DRG-001-RAINBOW', size: 'Grande (35cm)', color: 'Arcoíris Neón', material: 'Rainbow PLA', stock_quantity: 8, active: true },
      { id: 'var-3', product_id: 'prod-dragon-crystal', sku: 'MY3D-DRG-001-GOLD', size: 'Grande (35cm)', color: 'Oro Pulido', material: 'Silk Gold', stock_quantity: 5, active: true },
    ]
  },
  {
    id: 'prod-controller-holder-mech',
    name_es: 'Soporte Mech para Control PS5 / Xbox / Switch',
    name_en: 'Mech Controller Stand (PS5/Xbox/Switch)',
    slug: 'soporte-mech-control-gaming',
    sku: 'MY3D-GMG-002',
    description_es: 'Base futurista estilo robot mech 3D con detalles en Cyan y Negro PETG de alta resistencia. Diseñada para sostener controles o celulares.',
    description_en: 'Futuristic mech robotics inspired stand with non-slip grips for gamepads or mobile phones.',
    price: 29.99,
    sale_price: 24.99,
    category_id: 'cat-gaming',
    status: 'AVAILABLE',
    is_customizable: true,
    is_featured: true,
    is_new: false,
    is_best_seller: true,
    material: 'PETG / Tough PLA',
    weight_grams: 250,
    dimensions_cm: '18 x 14 x 15',
    lead_time_days: 2,
    rating: 5.0,
    review_count: 24,
    created_at: '2026-08-02T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    images: [
      { id: 'img-3', product_id: 'prod-controller-holder-mech', url: '/images/mech.jpg', alt_text: 'Mech Controller Stand', sort_order: 0, is_primary: true }
    ],
    variants: [
      { id: 'var-4', product_id: 'prod-controller-holder-mech', sku: 'MY3D-GMG-002-GRAPHITE', color: 'Grafito & Cyan MY3D', stock_quantity: 15, active: true },
      { id: 'var-5', product_id: 'prod-controller-holder-mech', sku: 'MY3D-GMG-002-ORANGE', color: 'Negro & Naranja', stock_quantity: 9, active: true }
    ]
  },
  {
    id: 'prod-planter-lowpoly',
    name_es: 'Maceta Geométrica Low-Poly (Mármol PLA)',
    name_en: 'Low-Poly Geometric Planter (Marble PLA)',
    slug: 'maceta-geometrica-lowpoly',
    sku: 'MY3D-DEC-003',
    description_es: 'Diseño icónico en filamento PLA acabado Mármol. Incluye plato de drenaje oculto. Ideal para suculentas y plantas pequeñas.',
    description_en: 'Iconic design with hidden saucer drainage. Ideal for succulents, cacti, and office desk decor.',
    price: 14.99,
    category_id: 'cat-decor',
    status: 'MADE_TO_ORDER',
    is_customizable: true,
    is_featured: false,
    is_new: true,
    is_best_seller: false,
    material: 'Eco PLA Marble',
    weight_grams: 120,
    dimensions_cm: '12 x 12 x 10',
    lead_time_days: 2,
    rating: 4.8,
    review_count: 15,
    created_at: '2026-08-03T00:00:00Z',
    updated_at: '2026-08-03T00:00:00Z',
    images: [
      { id: 'img-4', product_id: 'prod-planter-lowpoly', url: '/images/planter.jpg', alt_text: 'Low poly planter', sort_order: 0, is_primary: true }
    ],
    variants: [
      { id: 'var-6', product_id: 'prod-planter-lowpoly', sku: 'MY3D-DEC-003-MBL', color: 'Mármol Blanco', stock_quantity: 20, active: true },
      { id: 'var-7', product_id: 'prod-planter-lowpoly', sku: 'MY3D-DEC-003-BLK', color: 'Negro Mate', stock_quantity: 14, active: true }
    ]
  },
  {
    id: 'prod-keychain-custom-name',
    name_es: 'Llavero 3D Personalizado con Tu Nombre / Texto',
    name_en: 'Customized 3D Printed Name Keychain',
    slug: 'llavero-3d-personalizado-nombre',
    sku: 'MY3D-KEY-004',
    description_es: 'Llavero de doble capa ultrarresistente. Personaliza con tu nombre o palabra favorita en combinaciones Cyan y Naranja.',
    description_en: 'Ultra durable dual-layer keychain. Choose your text (up to 12 chars) and color combo.',
    price: 7.99,
    sale_price: 5.99,
    category_id: 'cat-llaveros',
    status: 'AVAILABLE',
    is_customizable: true,
    is_featured: true,
    is_new: false,
    is_best_seller: true,
    material: 'Dual PLA+',
    weight_grams: 30,
    dimensions_cm: '8 x 2.5 x 0.8',
    lead_time_days: 1,
    rating: 4.9,
    review_count: 67,
    created_at: '2026-08-04T00:00:00Z',
    updated_at: '2026-08-04T00:00:00Z',
    images: [
      { id: 'img-5', product_id: 'prod-keychain-custom-name', url: '/images/keychains.jpg', alt_text: 'Custom Keychains', sort_order: 0, is_primary: true }
    ],
    variants: [
      { id: 'var-8', product_id: 'prod-keychain-custom-name', sku: 'MY3D-KEY-004-PR', color: 'Cyan / Naranja MY3D', stock_quantity: 50, active: true }
    ]
  },
  {
    id: 'prod-lithophane-lamp-box',
    name_es: 'Caja de Luz Litofanía 3D Personalizada con Foto',
    name_en: 'Custom 3D Photo Lithophane Light Box',
    slug: 'caja-luz-litofania-foto-personalizada',
    sku: 'MY3D-CST-005',
    description_es: 'Transformamos tu foto favorita en una imagen en relieve 3D que cobra vida al encender la luz cálida LED incluida.',
    description_en: 'We convert your photo into a 3D relief image that illuminates brightly with included USB LED light.',
    price: 39.99,
    category_id: 'cat-personalizados',
    status: 'MADE_TO_ORDER',
    is_customizable: true,
    is_featured: true,
    is_new: true,
    is_best_seller: true,
    material: 'High Precision Resin / PLA',
    weight_grams: 300,
    dimensions_cm: '15 x 15 x 6',
    lead_time_days: 3,
    rating: 5.0,
    review_count: 19,
    created_at: '2026-08-05T00:00:00Z',
    updated_at: '2026-08-05T00:00:00Z',
    images: [
      { id: 'img-6', product_id: 'prod-lithophane-lamp-box', url: '/images/lithophane.jpg', alt_text: 'Lithophane Lamp Box', sort_order: 0, is_primary: true }
    ]
  },
  {
    id: 'prod-axolotl-flexi',
    name_es: 'Ajolote Articulado Flexi (Rosa Sostenible)',
    name_en: 'Flexi Articulated Axolotl (Pastel Pink)',
    slug: 'ajolote-articulado-flexi',
    sku: 'MY3D-DRG-006',
    description_es: 'Adorable ajolote flexible con movimiento fluido. Impreso en filamento seda satinado sin necesidad de ensamblaje.',
    description_en: 'Cute articulated axolotl fidget toy with smooth joints and detailed gills.',
    price: 12.99,
    sale_price: 9.99,
    category_id: 'cat-articulados',
    status: 'READY_TO_SHIP',
    is_customizable: false,
    is_featured: false,
    is_new: true,
    is_best_seller: true,
    material: 'Silk Satin PLA',
    weight_grams: 80,
    dimensions_cm: '18 x 5 x 4',
    lead_time_days: 1,
    rating: 4.9,
    review_count: 42,
    created_at: '2026-08-06T00:00:00Z',
    updated_at: '2026-08-06T00:00:00Z',
    images: [
      { id: 'img-7', product_id: 'prod-axolotl-flexi', url: '/images/axolotl.jpg', alt_text: 'Articulated Axolotl', sort_order: 0, is_primary: true }
    ],
    variants: [
      { id: 'var-9', product_id: 'prod-axolotl-flexi', sku: 'MY3D-DRG-006-PINK', color: 'Rosa Pastel Satin', stock_quantity: 18, active: true },
      { id: 'var-10', product_id: 'prod-axolotl-flexi', sku: 'MY3D-DRG-006-CYAN', color: 'Cyan Menta', stock_quantity: 14, active: true }
    ]
  }
];

export const DEMO_BOX_TEMPLATES: BoxTemplate[] = [
  {
    id: 'box-mini-5',
    name_es: 'Mini Mystery Box 3D (5 Productos)',
    name_en: 'Mini 3D Mystery Box (5 Items)',
    slug: 'mini-box-5',
    description_es: 'Elige 5 de tus figuras o llaveros favoritos con un 15% de descuento en paquete.',
    description_en: 'Pick 5 of your favorite figures or keychains with a 15% bundle discount.',
    required_item_count: 5,
    base_price: 39.99,
    bundle_discount_percent: 15,
    image_url: '/images/dragon.jpg',
    active: true,
  },
  {
    id: 'box-mega-10',
    name_es: 'Mega Collector Box (10 Productos)',
    name_en: 'Mega Collector Box (10 Items)',
    slug: 'mega-box-10',
    description_es: '¡El combo definitivo! 10 articulados y accesorios gaming con 25% de descuento.',
    description_en: 'The ultimate bundle! 10 articulated items and gaming accessories with 25% OFF.',
    required_item_count: 10,
    base_price: 79.99,
    bundle_discount_percent: 25,
    image_url: '/images/mech.jpg',
    active: true,
  }
];

export const DEMO_COUPONS: Coupon[] = [
  {
    id: 'c-welcome',
    code: 'BIENVENIDO10',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    min_purchase_amount: 15,
    active: true
  },
  {
    id: 'c-freeship',
    code: 'ENVIOENPR',
    discount_type: 'FREE_SHIPPING',
    discount_value: 0,
    min_purchase_amount: 50,
    active: true
  }
];
