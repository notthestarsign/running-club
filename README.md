# RUNNING CLUB NAME — Premium Multi-Page Website

A polished, fully responsive multi-page website for a running club. Built with HTML5, CSS3, and vanilla JavaScript only. No frameworks, no build tools required.

## Features

- **7 independent HTML pages**: Home, About, Activities, Events, Membership, Contact, Event Details
- **Shared design system**: CSS custom properties, consistent typography, spacing, and components
- **Animated loading screen**: Cartoon CSS runner with progress bar on initial load and every internal page transition
- **Smooth page transitions**: Intercepted same-origin navigation with coordinated loader animation
- **Reversible scroll animations**: Intersection Observer — elements animate in and can re-animate when scrolling back
- **Responsive mobile navigation**: Accessible hamburger menu with keyboard support
- **Active page indicators** in navigation
- **Activity & event filters** (vanilla JS)
- **FAQ accordion**
- **Contact form** with client-side validation and demonstration success state
- **Back-to-top button**
- **Scroll-responsive header**
- **Reduced-motion support** (`prefers-reduced-motion`)
- **Accessible**: semantic HTML, focus states, ARIA where appropriate, keyboard navigation

## Quick Start

1. Open the project folder.
2. Serve the files with any static server. Examples:

```bash
# Python 3
python -m http.server 8000

# Node (if you have npx)
npx serve .

# VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

3. Visit `http://localhost:8000` (or the port your server uses).

**Important:** Open via a local server rather than `file://` so relative links and navigation work correctly.

## Project Structure

```
running-club-website/
├── index.html          # Home
├── about.html          # About
├── activities.html     # Activities
├── events.html         # Events
├── membership.html     # Membership
├── contact.html        # Contact
├── event-details.html  # Sample event detail page
├── style.css           # Shared stylesheet
├── script.js           # Shared JavaScript
└── README.md
```

## Customisation Guide

### Brand name & placeholders

Search and replace across all files:

| Placeholder              | Replace with              |
|--------------------------|---------------------------|
| `RUNNING CLUB NAME`      | Your club name            |
| `YOUR CLUB SLOGAN`       | Your slogan               |
| `YOUR LOCATION`          | City / area               |
| `YOUR EMAIL`             | Contact email             |
| `YOUR SOCIAL LINK`       | Social profile URLs       |
| `[EVENT DATE]` etc.      | Real dates / times        |
| `[MEMBER COUNT]`         | Member count or remove    |
| `[MEMBERSHIP DETAILS]`   | Fees, policies, ages      |
| `[FEE]`                  | Actual membership prices  |

### Colours

Edit CSS custom properties at the top of `style.css`:

```css
:root {
  --color-primary: #0c0c0c;
  --color-accent: #ff3d00;
  --color-bg: #f7f6f3;
  /* ... */
}
```

### Typography

Google Fonts (Bebas Neue + DM Sans) are loaded via CDN. Change the `<link>` tags and the `--font-display` / `--font-body` variables if you prefer different typefaces.

### Contact form

The form validates on the client and shows a demonstration success message. It does **not** send emails. To enable real submissions:

1. Connect a service such as Formspree, Netlify Forms, or your own backend.
2. Update the form `action` and/or the submit handler in `script.js`.

### Loading duration

Adjust `LOADER_DURATION` (milliseconds) near the top of `script.js`.

## Browser Support

Modern evergreen browsers (Chrome, Firefox, Safari, Edge). Uses CSS Grid, Flexbox, custom properties, Intersection Observer, and `clamp()`.

## Accessibility Notes

- Semantic landmarks and heading hierarchy
- Visible focus indicators
- Mobile menu supports keyboard and Escape to close
- Form labels and error messages
- `prefers-reduced-motion` disables non-essential animation
- Loading overlay is marked with `role="status"` and does not permanently trap focus

## Licence

Demonstration template. Customise freely for your running club.
