import React, {
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-200">
            GPS REALTIME
          </span>
        </div>
      </div>

      <div className="absolute right-5 top-5 z-20">
        <div className="rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur-xl">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">
            STATUS OPERACIONAL
          </p>

          <p className="mt-2 text-xs font-bold text-white">
            {operationalMessage}
          </p>

          {eta && (
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-green-400">
              ETA {eta} min
            </p>
          )}
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={map => {
          mapRef.current = map;
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
        options={{
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: mapStyles,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        {routePath.length >= 2 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#22d3ee',
              strokeOpacity: 0.9,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        )}

        {origem && (
          <Marker position={origem} />
        )}

        {destino && (
          <Marker position={destino} />
        )}

        {animatedPos && (
          <Marker
            position={animatedPos}
            icon={{
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 7,
              fillColor: '#22d3ee',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff',
              rotation: heading,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
