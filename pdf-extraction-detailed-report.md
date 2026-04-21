# PDF Extraction Evaluation Report
## Detailed Analysis of Artist Rider PDFs

**Generated:** 2026-04-21  
**Total PDFs Analyzed:** 11  
**Current Extraction Method:** pdf2json

---

## 📊 Quality Distribution

| Quality | Count | Percentage | Recommendation |
|---------|-------|------------|----------------|
| ✅ High | 6 | 54.5% | Text-based extraction works well |
| ⚠️ Medium | 1 | 9.1% | May benefit from vision model |
| ❌ Low | 2 | 18.2% | Vision model recommended |
| 🔴 Failed | 2 | 18.2% | Vision model required |

**Total for Gemma 4 2B (text-based):** 7 PDFs (63.6%)  
**Total needing vision model:** 4 PDFs (36.4%)

---

## 📁 Detailed PDF Analysis

### 1. ✅ Beste Hira Tech & Hospitality rider 2024.pdf

| Property | Value |
|----------|-------|
| **Size** | 42.5 KB |
| **Layout** | Medium |
| **Quality** | ✅ HIGH |
| **Characters** | 1,068 |
| **Words** | 132 |
| **Lines** | 24 |
| **Control chars** | 2.15% |
| **Word density** | 61.8% |

**Content Sample:**
```
Triangle Agency Artist Rider
TECHNICAL RIDER Beste Hira (DJ set)
• 1 x Allen & Heath Xone 96/92 mixer or Pioneer DJM-V10. If not available DJM900 will suffice
• Recording output available
• 4 x Pioneer CDJ3000, CDJ2000NXS2 or Pioneer CDJ2000 NXS.
• All players are connected to each other by UTP so the link function is available and working properly.
• 2 x Monitor Speaker at ear height or aimed at the DJ's ear.
• Monitor speaker volume adjustable on the mixer.
• 4 x Free power plugs
```

**💡 Gemma 4 2B Recommendation:** Text-based extraction should work - simple layout with good quality

---

### 2. ✅ Doudou MD Rider.pdf

| Property | Value |
|----------|-------|
| **Size** | 4,207.4 KB |
| **Layout** | Medium |
| **Quality** | ✅ HIGH |
| **Characters** | 1,738 |
| **Words** | 222 |
| **Lines** | 25 |
| **Control chars** | 1.44% |
| **Word density** | 63.9% |

**Issues Detected:**
- ⚠️ Type3 fonts detected (custom glyphs) - 30+ warnings
- PDF uses special encoding that pdf2json struggles with

**Content Sample:**
```
PRESSKIT
C 3 x Bottles of water (sparkling) +
C x Bottle OF TEQUILA GOLD (NO Jose Cuervo), VODKA, or Champagne +
C 1 x Bucket of ice cubes+
C Solid DJ booth. Ideal height of approximately 100 cm.+
C 2x Red Bull+
C 1x Allen & Heath X:ONE 96 or 92 / (upon request) Rotary.
• 2x Pioneer CDJ2000 / CDJ 2000 Nexus CD Players connected with LAN cable.
```

**💡 Gemma 4 2B Recommendation:** Text-based extraction should work - but Type3 fonts may cause issues. Vision model could improve quality.

---

### 3. ⚠️ Papa Nugs Tech_Hospitality.pdf

| Property | Value |
|----------|-------|
| **Size** | 24.3 KB |
| **Layout** | Simple |
| **Quality** | ⚠️ MEDIUM |
| **Characters** | 358 |
| **Words** | 46 |
| **Lines** | 17 |
| **Control chars** | 4.47% |
| **Word density** | 64.2% |

**Issues Detected:**
- ⚠️ Control character ratio slightly elevated (4.47%)
- Short document with minimal content

**Content Sample:**
```
Papa Nugs
Techrider
Mixing Desk
DJM900 Nexus 2 / DJM A9 / DJM V10,
CDJ's
2x CDJ 2000 Nexus 2 / CDJ 3000
Turntables
2x Technics 1210s + Needles.
Hospitality
1x Bottle Premium Tequila
1x Bottle Sugar Free Lemonade, Ice,
Local Bottled Beers
1x Bottle Water
dinner on eve of show,
Uber's covered from hotel to accomodation.
```

**💡 Gemma 4 2B Recommendation:** Text-based extraction should work - simple layout with good quality

---

### 4. ✅ RIDER - DJ - Cecilia Tosh.pdf

| Property | Value |
|----------|-------|
| **Size** | 57.9 KB |
| **Layout** | Medium |
| **Quality** | ✅ HIGH |
| **Characters** | 1,782 |
| **Words** | 226 |
| **Lines** | 30 |
| **Control chars** | 1.63% |
| **Word density** | 63.4% |

**Content Sample:**
```
CECILIA TOSH
LITTLEBIG ARTIST RIDER
The following lists are the basic requirements for the Artist to perform, but depending on the nature of the Performance as discussed with the
Agent, it is not necessarily a statement of the full backline - for this you must refer to any additional riders provided with the contract.
These documents complete with the below requirements together constitute an integral part of this agreement, and cannot be modified without
written consent from the Agent
BILLING:
```

**💡 Gemma 4 2B Recommendation:** Text-based extraction should work - simple layout with good quality

---

### 5. ❌ RIDER AMORAL.pdf

| Property | Value |
|----------|-------|
| **Size** | 1,432.9 KB |
| **Layout** | Medium |
| **Quality** | ❌ LOW |
| **Characters** | 2,571 |
| **Words** | 3 |
| **Lines** | 28 |
| **Control chars** | 1.05% |
| **Word density** | 0.6% ⚠️ |

**Issues Detected:**
- ⚠️ Extremely low word density (0.6%)
- Text appears garbled/spaced out
- Likely encoding issue or custom font

**Content Sample (garbled):**
```
K R O M A N T I
AR TIST RIDER: AMORAL
E Q U I P M E N T
1 x A l l e n & H e a t h X O N E 9 6 ( p r e f e r r e d ) o r P i o n e e r V - 1 0 m i x e r
4 x P i o n e e r C D J - 2 0 0 0 N X S 2 o r P i o n e e r C D J - 3 0 0 0
2 x M o n i t o r s p e a k e r s a t e a r h e i g h t o r a i m e d a t t h e D J ' s e a r .
```

**💡 Gemma 4 2B Recommendation:** Vision model recommended - current extraction has issues (garbled text)

---

### 6. ✅ RIDER_.VRIL 2026.pdf

| Property | Value |
|----------|-------|
| **Size** | 448.7 KB |
| **Layout** | Complex |
| **Quality** | ✅ HIGH |
| **Characters** | 3,184 |
| **Words** | 413 |
| **Lines** | 60 |
| **Control chars** | 1.88% |
| **Word density** | 64.9% |

**Content Sample:**
```
.VRIL [LIVE]
LITTLEBIG ARTIST RIDER
The following lists are the basic requirements for the Artist to perform, but depending on the nature of the Performance as discussed with the
Agent, it is not necessarily a statement of the full backline - for this you must refer to any additional riders provided with the contract.
```

**💡 Gemma 4 2B Recommendation:** Vision model may help - complex layout detected

---

### 7. ❌ Running_Hot_Tech_Rider 2023.pdf

| Property | Value |
|----------|-------|
| **Size** | 112.8 KB |
| **Layout** | Medium |
| **Quality** | ❌ LOW |
| **Characters** | 3,117 |
| **Words** | 2 |
| **Lines** | 26 |
| **Control chars** | 0.80% |
| **Word density** | 0.3% ⚠️ |

**Issues Detected:**
- ⚠️ Extremely low word density (0.3%)
- Text appears spaced out with many spaces
- Likely encoding or font issue

**Content Sample (garbled):**
```
A R T I S T R I D E R
Running Hot - H e / H i m
C O N T A C T N R : + 4 4 7 5 0 7 4 8 3 7 4 0 - M a r k N e w m a n
T e c h n i c a l e q u i p m e n t t o b e p r o v i d e d b y t h e P R O M O T E R .
● 2 / 3 x C D J s ( 3 0 0 0 o r C D J 2 0 0 0 N e x u s ) l i n k e d
● 1 x P i o n e e r m i x e r ( D J M - V 1 0 / D J M - A 9 / D J M 9 0 0 N X S 2 )
```

**💡 Gemma 4 2B Recommendation:** Vision model recommended - current extraction has issues (garbled text)

---

### 8. ✅ Surf 2 Glory rider.pdf

| Property | Value |
|----------|-------|
| **Size** | 3,022.1 KB |
| **Layout** | Medium |
| **Quality** | ✅ HIGH |
| **Characters** | 1,320 |
| **Words** | 174 |
| **Lines** | 25 |
| **Control chars** | 2.50% |
| **Word density** | 65.9% |

**Issues Detected:**
- ⚠️ Type3 fonts detected (custom glyphs) - 20+ warnings
- PDF uses special encoding

**Content Sample:**
```
PRESSKIT
C Organisation will grant the artist a minimum of ten free entries on the guest list of
which at least two all-access
C Dressing room or open backstage access
C Sufficient free drinks; both alcoholic and non-alcoholic on request
C 1xAllen & Heath Xone 96. Any other mixers must be confirmed with
C Plenty of bottles of sparkling water
C Plenty of beers
C 2xCDJ3000.No other models. Please make sure the CDJs are linked via Ethernet
```

**💡 Gemma 4 2B Recommendation:** Text-based extraction should work - but Type3 fonts may cause issues. Vision model could improve quality.

---

### 9. 🔴 Tech Hospitality Rider Marron 092023.pdf

| Property | Value |
|----------|-------|
| **Size** | 1,125.5 KB |
| **Layout** | Simple |
| **Quality** | 🔴 FAILED |
| **Characters** | 0 |
| **Words** | 0 |
| **Lines** | 0 |
| **Control chars** | 100.00% |
| **Word density** | 0.0% |

**Issues Detected:**
- ❌ No text extracted at all
- Likely image-based/scanned PDF
- Font issues detected

**Content Sample:** (No text extracted)

**💡 Gemma 4 2B Recommendation:** Vision model required - current extraction failed completely

---

### 10. ✅ tech rider slin 01_25.pdf

| Property | Value |
|----------|-------|
| **Size** | 1,110.1 KB |
| **Layout** | Complex |
| **Quality** | ✅ HIGH |
| **Characters** | 1,938 |
| **Words** | 268 |
| **Lines** | 58 |
| **Control chars** | 3.35% |
| **Word density** | 69.1% |

**Content Sample:**
```
Tech Rider
VINYL POWER

Please note that we are a vinyl only crew.
The DJ booth should be in perfect conditions for playing vinyl!
Please read the requirements very well and make sure they are met.
In case of not meeting the requirements the artists can refuse performing.
A sound check is required more than 60 minutes before the doors are open.
This is extremely important, and most of the possible feedback problems are solved during it.
A qualified technician needs to be attending the sound check.
```

**💡 Gemma 4 2B Recommendation:** Vision model may help - complex layout detected

---

### 11. 🔴 Tech Rider Volvox 2023.pdf

| Property | Value |
|----------|-------|
| **Size** | 1,127.9 KB |
| **Layout** | Simple |
| **Quality** | 🔴 FAILED |
| **Characters** | 0 |
| **Words** | 0 |
| **Lines** | 0 |
| **Control chars** | 100.00% |
| **Word density** | 0.0% |

**Issues Detected:**
- ❌ No text extracted at all
- Likely image-based/scanned PDF
- Font issues detected

**Content Sample:** (No text extracted)

**💡 Gemma 4 2B Recommendation:** Vision model required - current extraction failed completely

---

## 📈 Analysis Summary

### PDFs by Category

**Text-Based (Gemma 4 2B should work):**
1. ✅ Beste Hira Tech & Hospitality rider 2024.pdf
2. ✅ Doudou MD Rider.pdf
3. ⚠️ Papa Nugs Tech_Hospitality.pdf
4. ✅ RIDER - DJ - Cecilia Tosh.pdf
5. ✅ RIDER_.VRIL 2026.pdf
6. ✅ Surf 2 Glory rider.pdf
7. ✅ tech rider slin 01_25.pdf

**Need Vision Model:**
1. ❌ RIDER AMORAL.pdf (garbled text)
2. ❌ Running_Hot_Tech_Rider 2023.pdf (garbled text)
3. 🔴 Tech Hospitality Rider Marron 092023.pdf (scanned/image)
4. 🔴 Tech Rider Volvox 2023.pdf (scanned/image)

### Key Findings

1. **Type3 Font Issues:** 3 PDFs (Doudou MD, Surf 2 Glory, VRIL) use Type3 fonts that cause warnings but still extract reasonably well

2. **Garbled Text Issues:** 2 PDFs (AMORAL, Running Hot) have text that's extracted but appears spaced out/garbled - likely encoding issues

3. **Complete Failures:** 2 PDFs (Marron, Volvox) are likely scanned/image-based with no extractable text

4. **Success Rate:** 63.6% of PDFs extract well with current method

---

## 🎯 Gemma 4 2B Implementation Recommendations

### Option 1: Simple Pipeline (If Gemma 4 2B works for vision)

**Approach:** Render PDF → Send images to Gemma 4 2B → Extract structured data

**Pros:**
- Handles all PDF types including scanned ones
- Single model for everything
- Simpler code

**Cons:**
- 2B parameters may struggle with complex layouts
- Need to verify vision support in LM Studio

### Option 2: Hybrid Pipeline (Recommended)

**Approach:**
1. Try text extraction first (pdfjs-dist)
2. If quality is high/medium → Use Gemma 4 2B with text
3. If quality is low/failed → Use vision model (LLaVA/CogVLM)

**Pros:**
- Fast path for text-based PDFs (63.6% of cases)
- Fallback for scanned PDFs (36.4% of cases)
- Best of both worlds

**Cons:**
- Slightly more complex
- Need to download vision model as fallback

### Option 3: Vision-Only Pipeline

**Approach:** Always render PDF to images → Send to Gemma 4 2B

**Pros:**
- Handles all PDF types consistently
- No quality assessment needed

**Cons:**
- Slower for text-based PDFs
- May not leverage Gemma 4's text capabilities

---

## 📋 Next Steps

1. **Download Gemma 4 2B** in LM Studio
2. **Test with scanned PDFs** (Marron, Volvox) to verify vision capabilities
3. **Test with garbled PDFs** (AMORAL, Running Hot) to see if vision improves extraction
4. **Implement pipeline** based on test results

### Test Script Ready

The test script at `src/test/pdf-extraction-evaluator.ts` is ready to:
- Analyze any new PDFs you add
- Compare extraction quality before/after Gemma 4 2B
- Generate detailed reports

---

## 📁 Results File

Detailed results exported to: `F:\PAL\pdf-analysis-results.json`

This file contains full analysis data for all 11 PDFs and can be used for further analysis or comparison.
