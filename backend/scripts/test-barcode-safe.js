async function test() {
  const codes = [
    '4987188100325', // Hộp 140 miếng nội địa Nhật
    '799441262497',  // Hộp 60 miếng UPC-12 Mỹ
    '0799441262497', // Hộp 60 miếng EAN-13 Mỹ
    '0654322487744', // US Packaging
    '654322487744',  // US UPC-12
    '893100105223',  // Long Châu
    '8935001701113', // GS1 VN
    '8935001701118', // Chính hãng VN
    '8935001701101', // Gói lẻ 10 miếng
    '8935001701106'  // GS1 VN gói lẻ
  ];

  for (const c of codes) {
    try {
      const res = await fetch('https://abcpharmacy.store/api/medicines/barcode/' + c);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.log(c, '=> HTML Error (Cloudflare or 502):', text.substring(0, 100));
        continue;
      }
      console.log(
        c.padEnd(14),
        '=> found:', String(data.found).padEnd(5),
        '| Matched Unit:', (data.matchedUnit?.unitName || '---').padEnd(25),
        '| Medicine:', data.medicine?.name?.substring(0, 35) || data.message
      );
    } catch (err) {
      console.error(c, 'Fetch error:', err.message);
    }
    // Nghỉ 300ms
    await new Promise(r => setTimeout(r, 300));
  }
}

test();
