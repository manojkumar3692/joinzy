export const communityCatalog = [
  {
    "id": "altis-ashraya",
    "name": "Altis Ashraya",
    "city": "Chennai, India",
    "cityName": "Chennai",
    "area": "Mangadu",
    "address": "Kundrathur Main Road, Sri Pandian Nagar, Mangadu, Chennai, Tamil Nadu 600122",
    "sourceUrl": "https://www.jllhomes.co.in/apartments-new/chennai/altis-ashraya",
    "country": "India",
    "currency": "INR",
    "residents": 0
  },
  {
    "id": "osian-chlorophyll",
    "name": "Osian Chlorophyll",
    "city": "Chennai, India",
    "cityName": "Chennai",
    "area": "Porur",
    "address": "Porur Link Road, Porur, Chennai, Tamil Nadu 600116",
    "sourceUrl": "https://www.waze.com/live-map/directions/in/tn/chennai/osian-chlorophyll?to=place.ChIJ22-bGQRhUjoRhj8DY9qmfLM",
    "country": "India",
    "currency": "INR",
    "residents": 0
  },
  {
    "id": "brigade-el-dorado",
    "name": "Brigade El Dorado",
    "city": "Bengaluru, India",
    "cityName": "Bengaluru",
    "area": "Bagalur",
    "address": "Aerospace Park, Huvinayakanahalli, Bagalur, Bengaluru, Karnataka 562149",
    "sourceUrl": "https://www.brigadeeldorado.com/location",
    "country": "India",
    "currency": "INR",
    "residents": 0
  },
  {
    "id": "hiranandani-egattur",
    "name": "House of Hiranandani, Egattur",
    "city": "Chennai, India",
    "cityName": "Chennai",
    "area": "Egattur / OMR",
    "address": "5/63, Old Mahabalipuram Road, Egattur, Chennai, Tamil Nadu",
    "sourceUrl": "https://www.houseofhiranandani.com/download/location_broucher/project_location/omr1.pdf",
    "country": "India",
    "currency": "INR",
    "residents": 0
  },
  {
    "id": "brigade-gateway",
    "name": "Brigade Gateway",
    "city": "Bengaluru, India",
    "cityName": "Bengaluru",
    "area": "Malleswaram / Rajajinagar",
    "address": "Dr Rajkumar Road, Malleswaram\u2013Rajajinagar, Bengaluru, Karnataka 560055",
    "sourceUrl": "https://www.brigadegroup.com/contact-us",
    "country": "India",
    "currency": "INR",
    "residents": 0
  },
  {
    "id": "prestige-lakeside",
    "name": "Prestige Lakeside Habitat",
    "city": "Bengaluru, India",
    "cityName": "Bengaluru",
    "area": "Varthur / Gunjur",
    "address": "Varthur\u2013Sarjapur Road, Gunjur, Bengaluru, Karnataka 560087",
    "sourceUrl": "https://www.groupmrg.com/lakeside-habitat.html",
    "country": "India",
    "currency": "INR",
    "residents": 0
  }
];
export const communityMapUrl=c=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name+", "+(c.address||c.city))}`;
export function upgradeCommunities(state){state.communities??=[];for(const c of communityCatalog){if(!state.communities.some(x=>x.id===c.id))state.communities.push({...c});}return state;}
