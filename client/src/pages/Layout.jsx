import React from "react";


const Layout = ({ children }) => {
  return (
    <div className="layout">
      <h1>Layout</h1>
      <p>This is the layout page.</p>
      {children}
    </div>
  );
};

export default Layout;