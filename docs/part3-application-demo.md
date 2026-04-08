# Part 3 Application Demo Outline

## Positioning
Ashtakoota is a dating app for users who want compatibility screening built around Vedic astrology rather than purely swipe-based matching. The product pitch is that intent, chart structure, and relational compatibility matter before people invest time in a conversation.

## 5-minute presentation structure
1. Problem
   - Mainstream dating apps are optimized for volume, not compatibility or intent.
   - Users looking for marriage-oriented or culturally specific matching often want more context before meeting.
2. Product
   - Users sign up with birth details, receive chart-derived profile traits, browse compatible profiles, and request or receive compatibility readings.
   - Mutual likes create matches automatically, while intentional reading requests support slower, more deliberate evaluation.
3. Best features to show
   - Compatibility breakdown with all eight kootas and a score label.
   - Match history and certificate generation.
   - Real-time chat once two users match.
   - Insights / query lab showing that the app is backed by a serious relational schema.
4. Why it is stronger after Part 3
   - Compatibility rules now live in normalized SQL tables instead of hardcoded JavaScript.
   - The schema enforces pair integrity and prevents duplicate symmetric match/evaluation rows.
   - The app now has analytics and demonstration tooling that directly reflects the database design.
5. Closing
   - The app is not just a UI shell over a database assignment; the relational model now meaningfully drives app behavior and analysis.

## Demo users
- `arjun_demo@example.com`
- `maya_demo@example.com`
- `neel_demo@example.com`
- `tara_demo@example.com`
- `priya_demo@example.com`
- `kabir_demo@example.com`

All seeded demo accounts use password `Part3Demo!`.
