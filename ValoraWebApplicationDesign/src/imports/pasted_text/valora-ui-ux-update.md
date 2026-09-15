Update the existing VALORA UI/UX to be fully responsive and optimized for:

- Desktop
- Tablet
- Mobile

IMPORTANT:
Do NOT redesign the visual identity.
Do NOT change the existing VALORA brand direction.
Do NOT remove existing functionality.
Do NOT create a completely different mobile UI.

Preserve the current premium, classy, minimal, editorial aesthetic and adapt it intelligently across screen sizes.

==================================================
RESPONSIVE BREAKPOINTS
==================================================

Design and test for at least:

Mobile:
320px – 767px

Tablet:
768px – 1023px

Desktop:
1024px+

Also ensure the layout behaves correctly at intermediate widths rather than only at these exact breakpoints.

==================================================
MOBILE UX
==================================================

Optimize every screen for one-handed mobile use.

Requirements:

- Mobile-first spacing
- Touch-friendly controls
- Minimum comfortable tap targets
- No horizontal scrolling
- Readable typography
- Proper image cropping
- Simplified navigation
- Bottom navigation where appropriate
- Mobile-friendly forms
- Full-width primary actions where appropriate
- Proper keyboard behavior
- Safe-area support for modern phones

Navigation should become compact on mobile without losing important functionality.

==================================================
TABLET UX
==================================================

Tablet should NOT simply be a stretched mobile layout.

Use the available space intelligently.

Requirements:

- Two-column layouts where appropriate
- Better use of whitespace
- Larger profile cards
- Comfortable navigation
- Adaptive grids
- Appropriate image proportions
- Forms that use available width efficiently

The result should feel intentionally designed for tablets.

==================================================
DESKTOP UX
==================================================

Preserve the existing desktop experience while improving proportional spacing where necessary.

Use:

- multi-column layouts
- generous whitespace
- larger visual hierarchy
- balanced content widths
- appropriate maximum-width containers

Do not allow content to become excessively wide on large monitors.

==================================================
RESPONSIVE COMPONENT BEHAVIOR
==================================================

Every major component must adapt intelligently.

Header:
Desktop → full navigation
Tablet → compact navigation
Mobile → compact header + mobile navigation

Hero:
Desktop → editorial split/full-width composition
Tablet → adaptive composition
Mobile → vertically stacked composition

Profile cards:
Desktop → grid/list
Tablet → adaptive 2-column or compact layout
Mobile → single-column cards

Forms:
Desktop → multi-column where appropriate
Tablet → adaptive columns
Mobile → single-column

Messaging:
Desktop → conversation list + chat panel
Tablet → adaptive layout
Mobile → conversation list → chat screen navigation

Settings:
Desktop → sidebar + content
Tablet → compact sidebar/tabs
Mobile → stacked sections

==================================================
TYPOGRAPHY
==================================================

Use fluid typography where appropriate.

Ensure:

- Headlines remain visually strong
- Body text remains readable
- Buttons remain legible
- No text overflow
- No awkward line breaks
- No clipped content

Do not simply scale everything proportionally.

Use proper responsive type hierarchy.

==================================================
IMAGES
==================================================

All imagery must remain visually intentional across screen sizes.

Use:

- responsive image sizing
- appropriate object-fit/object-position
- consistent aspect ratios
- optimized loading

The VALORA editorial hero imagery should remain premium on mobile and tablet rather than becoming a cropped or awkward thumbnail.

==================================================
SPACING
==================================================

Use responsive spacing values.

Desktop:
Generous

Tablet:
Moderate

Mobile:
Compact but comfortable

Avoid both:
- excessive empty space on mobile
- cramped layouts on desktop

==================================================
INTERACTION
==================================================

Ensure all interactive elements are:

- touch-friendly
- keyboard accessible
- visually obvious
- easy to reach
- properly spaced

Avoid hover-dependent interactions on mobile.

Any feature that relies on hover on desktop must have a mobile-friendly alternative.

==================================================
ACCESSIBILITY
==================================================

Maintain:

- semantic HTML
- keyboard navigation
- visible focus states
- accessible form labels
- adequate contrast
- meaningful alt text
- screen-reader-friendly controls

==================================================
PERFORMANCE
==================================================

Responsive design must not introduce unnecessary performance problems.

Use:

- optimized images
- lazy loading where appropriate
- responsive image sizes
- minimal unnecessary JavaScript
- efficient component rendering

==================================================
IMPLEMENTATION RULES
==================================================

Before modifying anything:

1. Inspect the existing UI.
2. Identify every page and major component.
3. Identify the current responsive behavior.
4. Identify desktop-only assumptions.
5. Identify components that require breakpoint-specific changes.

Then implement the responsive improvements.

Do NOT rebuild working components unnecessarily.

Do NOT duplicate entire pages for desktop/tablet/mobile unless technically necessary.

Prefer responsive CSS/layout behavior and reusable components.

==================================================
VALIDATION
==================================================

After implementation, test at:

320px
375px
390px
430px
768px
820px
912px
1024px
1280px
1440px
1920px

Check every major screen for:

- overflow
- clipping
- broken alignment
- unreadable text
- oversized elements
- tiny touch targets
- awkward spacing
- navigation issues
- image distortion
- broken forms
- modal/dialog issues

FINAL RESULT:

VALORA should feel like ONE cohesive premium product across desktop, tablet, and mobile—not three different interfaces.

The visual identity remains:

Quiet luxury
+
Modern technology
+
Meaningful human connection

Do not compromise the existing aesthetic while making it responsive.