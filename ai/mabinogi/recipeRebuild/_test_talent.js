const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')

const dataDir = path.join(__dirname, '..', 'data', 'IT')

// SightOfOtherSide items from old project
const sightMagicCraft = [85262,1040006,1230007,1420000,1040007,1230008,1420001,
  1010055,1270022,5000142,
  1000059,1010070,1020004,1070014,1200043,1210067,1220018,1250026,1260020,1270029,1290021,1400012,
  5100276,5100278,5100281,5100285,5100286,5100290,5100291,5100292,5100294,5100300,5100302,
  41266,41271,1020011]

async function check() {
  const data = fs.readFileSync(path.join(dataDir, 'production.xml'), 'utf-16le')
  const result = await new xml2js.Parser().parseStringPromise(data)
  
  const mc = result.Production.MagicCraft[0].Production
  console.log('Checking SightOfOtherSide MagicCraft items in production.xml:')
  
  const sightItems = mc.filter(p => sightMagicCraft.includes(parseInt(p.$.ProductItemId)))
  const normalItems = mc.filter(p => !sightMagicCraft.includes(parseInt(p.$.ProductItemId)))
  
  console.log(`Found ${sightItems.length} SightOfOtherSide items, ${normalItems.length} normal items`)
  
  // Compare attributes between sight and normal items
  if (sightItems.length > 0) {
    const sampleSight = sightItems[0].$
    console.log('\nSample SightOfOtherSide item:')
    console.log('  ProductItemId:', sampleSight.ProductItemId)
    console.log('  Title:', sampleSight.Title)
    console.log('  PropFilter:', sampleSight.PropFilter || 'none')
    console.log('  Feature:', sampleSight.Feature || 'none')
    console.log('  __feature:', sampleSight.__feature || 'none')
    
    // Check if PropFilter="/magic_cauldron/" is common
    const sightWithCauldron = sightItems.filter(p => p.$.PropFilter === '/magic_cauldron/')
    const normalWithCauldron = normalItems.filter(p => p.$.PropFilter === '/magic_cauldron/')
    console.log(`\nSight items with /magic_cauldron/: ${sightWithCauldron.length}/${sightItems.length}`)
    console.log(`Normal items with /magic_cauldron/: ${normalWithCauldron.length}/${normalItems.length}`)
  }
  
  // Also check the Handicraft section
  const hc = result.Production.Handicraft[0].Production
  // Check TailoringItem SightOfOtherSide from old project's TailoringItem.js
  
  // Check all production sections for SpecialTalent
  for (const section of Object.keys(result.Production)) {
    const sectionData = result.Production[section][0]
    if (sectionData.Production) {
      const prods = sectionData.Production
      const withTalent = prods.filter(p => p.$.SpecialTalent && p.$.SpecialTalent.trim())
      if (withTalent.length > 0) {
        console.log(`\n${section}: ${withTalent.length} items with SpecialTalent`)
        withTalent.forEach(p => {
          console.log(`  ${p.$.ProductItemId}: SpecialTalent=${p.$.SpecialTalent}`)
        })
      }
    }
  }
}

check().catch(console.error)
