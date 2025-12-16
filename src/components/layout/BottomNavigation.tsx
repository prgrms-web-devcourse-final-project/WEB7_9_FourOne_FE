'use client'

import { Bell, Home, Plus, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomNavigationProps {
  notificationCount?: number
}

export function BottomNavigation({
  notificationCount = 0,
}: BottomNavigationProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/',
      icon: Home,
      label: '홈',
      isActive: pathname === '/',
    },
    // {
    //   href: '/posts',
    //   icon: MessageSquare,
    //   label: '게시판',
    //   isActive: pathname.startsWith('/posts'),
    // },
    {
      href: '/register-product',
      icon: Plus,
      label: '판매',
      isActive: pathname === '/register-product',
      isPrimary: true,
    },
    {
      href: '/notifications',
      icon: Bell,
      label: '알림',
      isActive: pathname === '/notifications',
      badge: notificationCount,
    },
    {
      href: '/my-info',
      icon: User,
      label: '내정보',
      isActive: pathname === '/my-info',
    },
  ]

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-neutral-200/50 bg-white/95 shadow-lg shadow-neutral-200/50 backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around px-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.isActive

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-col items-center justify-center space-y-1 rounded-xl px-3 py-2 transition-all duration-200 ${
                isActive
                  ? 'text-primary-600 bg-primary-50 scale-105'
                  : 'hover:text-primary-600 hover:bg-primary-50/50 text-neutral-500 hover:scale-105'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-all duration-200 ${
                    isActive ? 'scale-110' : 'group-hover:scale-110'
                  }`}
                />
              </div>
              <span
                className={`text-xs font-medium transition-all duration-200 ${
                  isActive ? 'font-semibold' : 'group-hover:font-medium'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
