'use client';

import React, { useState, useEffect } from 'react'; 
import UserService from '@/services/user/user';
import { User } from '@/interfaces/user/user';
import { Menubar, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import Image from 'next/image';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

/**
 * Interface for the authentication component props.
 * @param userInfo - The user information to determine if the user is logged in or not.
 */
interface authProps {
  userInfo: User | undefined;
}

/**
 * Component for handling user authentication actions like login and logout.
 * @param prop - The properties containing user information.
 * @returns JSX.Element - The AuthComponent rendering the login/logout button and settings link.
 */
const AuthComponent: React.FC<authProps> = (prop) => {
  console.log('AuthComponent: ', prop.userInfo);
  return (
    <div className='flex flex-row items-center'>
      {/* If the user is not logged in, show the login link */}
      {prop.userInfo?.id == 0 && (
        <MenubarMenu>
          <MenubarTrigger className="text-white border border-gray px-3 py-1 rounded hover:bg-white hover:text-[#003049] transition">
            <Link href='/login'>Sign up</Link>
          </MenubarTrigger>
        </MenubarMenu>
      )}
      {/* If the user is logged in, show the logout link */}
      {prop.userInfo?.id != 0 && (
        <MenubarMenu>
          <MenubarTrigger className="text-white hover:text-yellow-300">
            <Link href='/login' onClick={() => UserService.emptyLocalStorageUser()}>
              Logout
            </Link>
          </MenubarTrigger>
        </MenubarMenu>
      )}
      {/* If the user is logged in, show the settings icon */}
      {prop.userInfo?.id != 0 && (
        <Link href='/setting' className='ml-8 text-white hover:text-yellow-300'>
          <FontAwesomeIcon icon={faGear} />
        </Link>
      )}
    </div>
  );
};

/**
 * NavigationBar component for rendering the navigation menu and user authentication options.
 * It adjusts based on the screen size using responsive design.
 */
export const NavigationBar = () => {
  // Array of navigation links for different sections
  const components = [
    { title: '買家', href: '/consumer' },
    { title: '賣家', href: '/tribe_resident/seller' },
    { title: '司機專區', href: '/driver' },
  ];

  // State for storing user information
  const [user, setUser] = useState<User>();

  /**
   * Custom hook for detecting the device type (mobile, tablet, or PC).
   * @returns {string} - The device type.
   */
  const useRWD = () => {
    const [device, setDevice] = useState('mobile');

    /**
     * Function to handle window resizing and determine the device type.
     */
    const handleRWD = () => {
      if (window.innerWidth > 768) {
        setDevice('PC');
      } else if (window.innerWidth > 576) {
        setDevice('tablet');
      } else {
        setDevice('mobile');
      }
    };

    // Effect to set up the event listener for window resizing
    useEffect(() => {
      const _user = UserService.getLocalStorageUser();
      setUser(_user);

      window.addEventListener('resize', handleRWD);
      handleRWD(); // Initial call to set the device type
      return () => {
        window.removeEventListener('resize', handleRWD);
      };
    }, []);

    return device;
  };

  // Determine the device type using the custom hook
  const device = useRWD();

  // Render the navigation bar for PC or tablet
  if (device === 'PC' || device === 'tablet') {
    return (
      <Menubar className='px-8 py-6 justify-between bg-[#003049] text-white w-full text-sm'>
        <div className='flex items-center space-x-4'>
          <Link href="/">
          <Image src="/box2.png" alt="Logo" width={100} height={100} className="object-contain cursor-pointer" />
          </Link>
          <div className='flex flex-row space-x-10'>
          {/* Render each navigation link */}
          {components.map((component) => (
            <MenubarMenu key={component.title}>
              <MenubarTrigger className='text-white hover:text-yellow-300'>
                <Link href={component.href}>{component.title}</Link>
              </MenubarTrigger>
            </MenubarMenu>
          ))}
          </div>
        </div>
        {/* Render the authentication component */}
        <AuthComponent userInfo={user} />
      </Menubar>
    );
  } else {
    // Render the navigation bar for mobile
    return (
      <Menubar className='px-2 py-2 justify-between bg-[#003049] text-white w-full'>
        <div className='flex items-center space-x-1'>
          <Image src="/logo.png" alt="Logo" width={40} height={40} className="bg-yellow-100 p-1" />
        </div>
        <NavigationMenu className='z-50'>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className='bg-[#003049] w-36 text-white hover:text-yellow-300'>頁面導覽</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className='grid w-full gap-3 p-4'>
                  {/* Render each navigation link for mobile */}
                  {components.map((component) => (
                    <Link
                      key={component.title}
                      href={component.href}
                      onClick={() => {
                        window.location.href = `${component.href}`;
                      }}
                      className="text-white hover:text-yellow-300"
                    >
                      {component.title}
                    </Link>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        {/* Render the authentication component */}
        <AuthComponent userInfo={user} />
      </Menubar>
    );
  }
};
