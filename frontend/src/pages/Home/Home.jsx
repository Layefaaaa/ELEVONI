import React from "react";
import { Helmet } from "react-helmet-async";
import "./Home.css";
import Header from "../../components/Header/Header";
import CategoryGrid from "../../components/CategoryGrid/CategoryGrid";
import FishDisplay from "../../components/FishDisplay/FishDisplay";
import AppDownload from "../../components/AppDownload/AppDownload";
import Features from "../../components/Features/Features";
import Reviews from "../../components/Reviews/Reviews";

const Home = () => {
  return (
    <div>
      <Helmet>
        <title>
          Elevoni Farms | Premium Smoked Catfish Direct From Our Farm
        </title>

        <meta
          name="description"
          content="Buy premium smoked catfish from Elevoni Farms. Carefully prepared, richly smoked, and conveniently delivered to your doorstep."
        />

        <link rel="canonical" href="https://elevonifarms.vercel.app/" />

        <meta
          property="og:title"
          content="Elevoni Farms - Premium Smoked Catfish"
        />

        <meta
          property="og:description"
          content="Shop premium smoked catfish from Elevoni Farms. Quality smoked fish, conveniently delivered."
        />

        <meta property="og:type" content="website" />

        <meta property="og:url" content="https://elevonifarms.vercel.app/" />
      </Helmet>

      <Header />

      <CategoryGrid />

      <FishDisplay />

      <Features />

      <Reviews />

      <AppDownload />
    </div>
  );
};

export default Home;
