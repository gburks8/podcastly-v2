import React from "react"
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Play, Download, Shield, Star } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">MediaPro</h1>
            </div>
            <Button onClick={() => window.location.href = '/auth'}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Professional Content for
            <span className="text-primary"> Real Estate Agents</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Access your custom video podcast content and professional headshots. 
            Download your complimentary content and unlock premium materials to boost your marketing.
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-blue-700 text-white px-8 py-3"
            onClick={() => window.location.href = '/auth'}
          >
            Access Your Content
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">What's Included</h3>
            <p className="text-lg text-gray-600">Professional content tailored for your real estate business</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader className="text-center">
                <Play className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Video Podcast Content</CardTitle>
                <CardDescription>
                  Professional video segments from your podcast session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 3 complimentary social media videos</li>
                  <li>• 9 premium extended segments</li>
                  <li>• Optimized for different platforms</li>
                  <li>• High-quality production</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Download className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Professional Headshots</CardTitle>
                <CardDescription>
                  High-resolution images for your marketing needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 1 complimentary headshot</li>
                  <li>• 4 additional premium variations</li>
                  <li>• Multiple angles and styles</li>
                  <li>• Print and digital ready</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Secure Access</CardTitle>
                <CardDescription>
                  Protected downloads and easy content management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Secure client portal</li>
                  <li>• Download history tracking</li>
                  <li>• Instant access after payment</li>
                  <li>• Re-download anytime</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
            ))}
          </div>
          <blockquote className="text-xl text-gray-600 italic mb-6">
            "The video content from MediaPro has transformed my social media presence. 
            The professional quality and variety of content keeps my audience engaged."
          </blockquote>
          <p className="text-gray-900 font-semibold">Sarah Johnson, Real Estate Agent</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-gray-600">© 2024 MediaPro Studios. All rights reserved.</p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-sm text-gray-600 hover:text-primary">Support</a>
              <a href="#" className="text-sm text-gray-600 hover:text-primary">Privacy Policy</a>
              <a href="#" className="text-sm text-gray-600 hover:text-primary">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
