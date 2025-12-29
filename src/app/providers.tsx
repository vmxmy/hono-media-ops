"use client"

import type React from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/contexts/theme-context"
import { I18nProvider } from "@/contexts/i18n-context"
import { TRPCReactProvider } from "@/trpc/react"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider defaultPalette="claude">
                <I18nProvider>
                    <TRPCReactProvider>{children}</TRPCReactProvider>
                </I18nProvider>
            </ThemeProvider>
        </SessionProvider>
    )
}
