import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', width: '100%', backgroundColor: '#F3F1EB',
      color: '#2C2B29', fontFamily: 'sans-serif', overflow: 'hidden',
      display: 'flex', position: 'relative'
    }}>

      {/* Noise texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        pointerEvents: 'none', opacity: 0.04, mixBlendMode: 'multiply'
      }}>
        <svg width="100%" height="100%">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* Grid lines */}
      {/* Grid lines — large checks */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        pointerEvents: 'none', opacity: 0.07
      }}>
        {/* Horizontal lines — every 25% */}
        {['25%', '50%', '75%'].map(top => (
          <div key={top} style={{ position: 'absolute', top, width: '100%', height: '1px', background: '#2C2B29' }} />
        ))}
        {/* Vertical lines — every 25% */}
        {['25%', '50%', '75%'].map(left => (
          <div key={left} style={{ position: 'absolute', left, width: '1px', height: '100%', background: '#2C2B29' }} />
        ))}
      </div>

      {/* Left sidebar */}
      

      {/* Main content */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '0 96px'
      }}>
        <div style={{ maxWidth: '900px', padding: '32px', marginLeft: '-32px' }}>

          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
            <span style={{ position: 'relative', display: 'flex', height: '6px', width: '6px' }}>
              <span style={{
                position: 'absolute', display: 'inline-flex',
                height: '100%', width: '100%', borderRadius: '50%',
                background: '#2C2B29', opacity: 0.4,
                animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite'
              }} />
              <span style={{
                position: 'relative', display: 'inline-flex',
                borderRadius: '50%', height: '6px', width: '6px',
                background: '#2C2B29'
              }} />
            </span>
            <span style={{
              fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.3em', fontWeight: '500', color: '#6B6A65'
            }}>
              System Secure
            </span>
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: 'clamp(3rem, 8vw, 6.5rem)',
            fontWeight: '300', letterSpacing: '-0.03em',
            lineHeight: '0.9', marginBottom: '32px', color: '#2C2B29'
          }}>
            Hostel Issue <br />
            <span style={{
              fontStyle: 'italic', color: '#706E68',
              fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
              fontWeight: '400', letterSpacing: 'normal',
              fontFamily: 'Georgia, serif'
            }}>
              Management.
            </span>
          </h1>

          {/* Divider */}
          <div style={{
            width: '96px', height: '1px',
            background: 'rgba(44,43,41,0.3)', marginBottom: '32px'
          }} />

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.4rem)', fontWeight: '300',
            color: '#706E68', maxWidth: '600px',
            marginBottom: '56px', lineHeight: '1.7'
          }}>
            A refined digital environment to formally report, track, and resolve
            administrative and structural hostel requests.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/login')}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#2C2B29';
              e.currentTarget.style.color = '#F3F1EB';
              e.currentTarget.querySelector('svg').style.transform = 'translateX(12px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#2C2B29';
              e.currentTarget.querySelector('svg').style.transform = 'translateX(0)';
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '288px', padding: '20px 32px',
              border: '1px solid #2C2B29', background: 'transparent',
              color: '#2C2B29', cursor: 'pointer',
              transition: 'all 0.5s ease'
            }}
          >
            <span style={{
              fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.2em', fontWeight: '600'
            }}>
              Access Portal
            </span>
            <svg
              style={{ width: '20px', height: '20px', transition: 'transform 0.5s ease' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>

        </div>
      </div>

      {/* Ping animation */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}