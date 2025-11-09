import React from 'react'

export default function Example() {
  return (
    <>
    <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className="row g-2 align-items-center">
              <div className="col">
                <h2 className="page-title">
                  Page Title
                </h2>
              </div>
              <div className='col-auto ms-auto d-print-none'>
                <button className='btn btn-purple'>Demo</button>
              </div>
            </div>
          </div>
        </div>
        <div className="page-body">
            <div className="container-xl d-flex flex-column justify-content-center">
                <div className='row'>
                    <div className="col-md-6 col-lg-3">
                        <div className="card">
                        <div className="card-status-bottom bg-success"></div>
                    <div className="card-body">
                        <h3 className="card-title">Card with bottom status</h3>
                        <p className="text-secondary">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aperiam deleniti fugit incidunt, iste, itaque minima
                        neque pariatur perferendis sed suscipit velit vitae voluptatem.</p>
                    </div>
                    </div>
                </div>
                <div className="col-md-6 col-lg-3">
                    <div className="card">
                    <div className="card-status-start bg-primary"></div>
                    <div className="card-body">
                        <h3 className="card-title">Card with side status</h3>
                        <p className="text-secondary">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aperiam deleniti fugit incidunt, iste, itaque minima
                        neque pariatur perferendis sed suscipit velit vitae voluptatem.</p>
                    </div>
                    </div>
                </div>
                <div className="col-md-6 col-lg-3">
                    <div className="card">
                    <div className="ribbon ribbon-top bg-yellow">{/* Download SVG icon from http://tabler-icons.io/i/star */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" /></svg>
                    </div>
                    <div className="card-body">
                        <h3 className="card-title">Card with top ribbon</h3>
                        <p className="text-secondary">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto at consectetur culpa ducimus eum fuga fugiat, ipsa iusto, modi nostrum recusandae reiciendis saepe.</p>
                    </div>
                    </div>
                </div>
                <div className="col-md-6 col-lg-3">
                    <div className="card">
                    <div className="ribbon bg-red">NEW</div>
                    <div className="card-body">
                        <h3 className="card-title">Card with text ribbon</h3>
                        <p className="text-secondary">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Architecto at consectetur culpa ducimus eum fuga fugiat, ipsa iusto, modi nostrum recusandae reiciendis saepe.</p>
                    </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    </div>
    </>
  )
}
