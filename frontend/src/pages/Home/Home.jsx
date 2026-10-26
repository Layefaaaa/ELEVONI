import React from "react";
import { Helmet } from "react-helmet-async";
import "./Home.css";
import Header from "../../components/Header/Header";
import CategoryGrid from "../../components/CategoryGrid/CategoryGrid";
import FishDisplay from "../../components/FishDisplay/FishDisplay";
import AppDownload from "../../components/AppDownload/AppDownload";
import Features from "../../components/Features/Features";
import Reviews from "../../components/Reviews/Reviews";
import VendorInvitation from "../../components/VendorInvitation/VendorInvitation";

const Home = () => {
  return (
    <div>
      <Helmet>
        <title>
          Elevoni Farms | Agricultural Products & Smoked Catfish
        </title>

        <meta
          name="description"
          content="Explore agricultural marketplace listings and buy Elevoni smoked catfish directly. Confirm availability and delivery before ordering."
        />

        <link rel="canonical" href="https://elevonifarms.vercel.app/" />

        <meta
          property="og:title"
          content="Elevoni Farms - Agricultural Products and Smoked Catfish"
        />

        <meta
          property="og:description"
          content="Explore agricultural marketplace listings or shop Elevoni smoked catfish directly."
        />

        <meta property="og:type" content="website" />

        <meta property="og:url" content="https://elevonifarms.vercel.app/" />
      </Helmet>

      <Header />

      <CategoryGrid />

      <VendorInvitation />

      <FishDisplay />

      <Features />

      <Reviews />

      <AppDownload />
    </div>
  );
};

export default Home;
