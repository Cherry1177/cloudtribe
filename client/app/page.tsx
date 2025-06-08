'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NavigationBar } from '@/components/NavigationBar';


export default function Page() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <NavigationBar />
      <section className="bg-[#cce6f6] p-8">
        <div className="flex flex-col lg:flex-row items-center justify-center mt-12 max-w-6xl mx-auto">
        {/* left side*/}
          <div className="lg:w-1/2 w-full mb-8 lg:mb-0 flex items-center justify-start">
            <Image src="/newlogo.png" alt="CloudTribe" width={500} height={500} /> 
          </div>

        {/* right side */}
          <div className="lg:w-1/2 w-full text-left">
            <h1 className="text-5xl font-bold mb-4">Welcome to CloudTribe</h1>
            <p className="text-gray-700 mb-4">
            CloudTribe is a platform built for real-world connection. Whether you're selling products from a local tribe, or offering services, CloudTribe helps you build, organize, and grow your community. From ride sharing to resource sharing, we make it easy to connect with others who care about what you do. Create, join, or grow communities around what matters most — all in one place.
            </p>
          <Button className="bg-[#1d3557] text-white">Start now</Button>
          </div>
        </div>
      </section>

      {/* Guidelines Section */}
      <section className="bg-[#cce6f6] p-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="bg-white h-72 mb-2 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
              <Image
                src="/available.png"
                alt="可用服務"
                width={400}
                height={400}
                className="object-contain"
              />
            </div>
            <p className="text-2xl font-semibold">可用服務</p>
          </div>
          <div>
            <div className="bg-white h-72 mb-2 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
              <Image
                src="/guildline.png"
                alt="User Guidelines (photos)"
                width={300}
                height={350}
                className="object-contain"
              />
            </div>
            <p className="text-2xl font-semibold">使用導覽</p>
          </div>
          <div>
            <div className="bg-white h-72 mb-2 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
              <Image
                src="/guide-video.png"
                alt="User Guidelines (videos)"
                width={200}
                height={200}
                className="object-contain"
              />
            </div>
            <p>User Guidelines (videos)</p>
          </div>
        </div>
      </section>

      {/* Product Section */}
      <section className="text-center p-8">
        <h2 className="text-5xl font-bold mb-2">Just in!</h2>
        <p className="mb-6 text-gray-600">Browse our newest products</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-[#cce6f6] p-4 rounded shadow">
              <div className="bg-white h-40 mb-2 rounded shadow relative">
                <div className="absolute top-0 left-0 bg-blue-200 text-xs px-2 py-1 rounded-br">NEW PRODUCT</div>
              </div>
              <h3 className="font-semibold">Product #{n}</h3>
              <p className="text-sm text-gray-600">Name:</p>
              <p className="text-sm text-gray-600">Price:</p>
              <p className="text-sm text-gray-600">Location:</p>
              <Button className="mt-2 bg-[#f4a261] text-white hover:bg-[#e76f51]">Buy now</Button>
            </div>
          ))}
        </div>
      </section>

      {/* Seller Section */}
      <section className="bg-[#cce6f6] p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Become a seller</h2>
        <p className="mb-6 text-gray-600">Empower your local presence. Share your skills. Earn with your community.</p>
        <div className="flex justify-center gap-6 mb-4">
          <div className="bg-gray-300 w-16 h-16 rounded"></div>
          <div className="bg-gray-300 w-16 h-16 rounded"></div>
          <div className="bg-gray-300 w-16 h-16 rounded"></div>
        </div>
        <div className="flex justify-center gap-6">
          <Button variant="outline">List Your Products</Button>
          <Button variant="outline">Choose Availability</Button>
          <Button variant="outline">Start Earning</Button>
        </div>
        <Button className="mt-6 bg-pink-300">Create a seller profile now</Button>
      </section>

      {/* Driver Section */}
      <section className="bg-white px-8 py-16">
        <div className="flex flex-col lg:flex-row justify-between items-center">
          
          {/* Left: Text Content */}
          <div className="lg:w-1/2 mb-8 lg:mb-0">
            <h2 className="text-4xl font-bold mb-4">Become a cloudTribe driver</h2>
            <p className="text-base text-gray-700 leading-relaxed">
              Join a growing network of local drivers making real connections and real income.
              Whether you’re a student with free time or a community member with a vehicle, 
              CloudTribe gives you the tools to offer rides, deliveries, or custom transport 
              services to people nearby.
            </p>
          </div>

          {/* Right: Icons & Buttons */}
          <div className="lg:w-1/2 flex justify-center gap-6">
            {[ 
              { icon: 'Set your schedule' }, 
              { icon: 'choose your service area' }, 
              { icon: 'get paid' } 
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center space-y-3">
                <div className="bg-[#8ed1fc] w-24 h-24 rounded-xl"></div>
                <Button className="bg-[#cce6f6] text-black px-4 py-2 hover:bg-blue-100 whitespace-nowrap">
                  {item.icon}
                </Button>
              </div>
            ))}
          </div>
          
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-[#2b5e75] text-white p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <div className="bg-white w-16 h-16 mb-2 text-center text-black">Logo</div>
          <p>Let's stay in touch! Sign up to our newsletter and get the best deals!</p>
        </div>
        <div>
        </div>
        <div>
          <p className="font-bold mb-2">Help</p>
          <p>FAQ</p>
          <p>Contact us</p>
        </div>
        <div>
          <p className="font-bold mb-2">Other</p>
          <p>Privacy Policy</p>
        </div>
      </footer>
    </main>
  );
}
