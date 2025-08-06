
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type NavigationContext = {
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleMobileMenu: () => void
}

const NavigationContext = React.createContext<NavigationContext | null>(null)

function useNavigation() {
  const context = React.useContext(NavigationContext)
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider.")
  }
  return context
}

const NavigationProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(
  (
    {
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)

    const toggleMobileMenu = React.useCallback(() => {
      setOpenMobile((open) => !open)
    }, [setOpenMobile])

    const contextValue = React.useMemo<NavigationContext>(
      () => ({
        isMobile,
        openMobile,
        setOpenMobile,
        toggleMobileMenu,
      }),
      [isMobile, openMobile, setOpenMobile, toggleMobileMenu]
    )

    return (
      <NavigationContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            className={cn(
              "group/nav-wrapper",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </NavigationContext.Provider>
    )
  }
)
NavigationProvider.displayName = "NavigationProvider"

const Navigation = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(
  (
    {
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "sticky top-0 z-50 bg-background/95 shadow-sm backdrop-blur-sm",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Navigation.displayName = "Navigation"

const NavigationTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleMobileMenu } = useNavigation()

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleMobileMenu()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Menu</span>
    </Button>
  )
})
NavigationTrigger.displayName = "NavigationTrigger"


const NavigationInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn(
        "flex-1 flex flex-col",
        className
      )}
      {...props}
    />
  )
})
NavigationInset.displayName = "NavigationInset"


const NavigationHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-between h-[80px] w-full px-4 sm:px-6 md:px-8 border-b", className)}
      {...props}
    />
  )
})
NavigationHeader.displayName = "NavigationHeader"

const NavigationContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex-1 flex-col md:flex-row md:items-center md:justify-end",
        "flex h-full w-full flex-col gap-2 overflow-auto p-2 md:p-0 md:h-auto md:overflow-visible",
        className
      )}
      {...props}
    />
  )
})
NavigationContent.displayName = "NavigationContent"


const NavigationMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex items-center gap-2", className)}
    {...props}
  />
))
NavigationMenu.displayName = "NavigationMenu"

const NavigationMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
NavigationMenuItem.displayName = "NavigationMenuItem"

const navigationMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center justify-center gap-2 overflow-hidden rounded-md px-3 text-left font-medium outline-none ring-primary transition-all focus-visible:ring-2 active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 border-2 border-transparent text-muted-foreground data-[active=true]:text-primary hover:text-primary [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      size: {
        default: "h-11 text-sm",
        sm: "h-9 text-xs",
        lg: "h-14 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const NavigationMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof navigationMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      size = "default",
      tooltip,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile } = useNavigation()

    const button = (
      <Comp
        ref={ref}
        data-active={isActive}
        className={cn(navigationMenuButtonVariants({ size }), className)}
        {...props}
      >
        {children}
      </Comp>
    )

    if (!tooltip || isMobile) {
      return button
    }
    
    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      }
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="center"
          {...tooltip}
        />
      </Tooltip>
    )
  }
)
NavigationMenuButton.displayName = "NavigationMenuButton"


export {
  Navigation,
  NavigationContent,
  NavigationHeader,
  NavigationInset,
  NavigationMenu,
  NavigationMenuButton,
  NavigationMenuItem,
  NavigationProvider,
  NavigationTrigger,
  useNavigation,
}
