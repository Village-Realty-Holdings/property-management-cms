import React from 'react'

import { AWAYDAY_BRAND } from '@/lib/adminBranding'

/** Sits under the nav links: who runs the platform and where to get help. */
export const NavFooter: React.FC = () => (
  <div className="nav-footer">
    <a className="nav-footer__link" href="https://www.awayday.com" rel="noreferrer" target="_blank">
      Powered by {AWAYDAY_BRAND.name}
    </a>
    <a className="nav-footer__link" href="https://www.awayday.com/contact" rel="noreferrer" target="_blank">
      Get help
    </a>
  </div>
)
