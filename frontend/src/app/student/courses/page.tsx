"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function StudentCoursesPage() {
  const { data: session } = useSession();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user?.id) {
      fetchContent();
    }
  }, [session]);

  const fetchContent = async () => {
    try {
      const token = (session?.user as any)?.accessToken;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lms/student/${session?.user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch content");
      
      const data = await res.json();
      setResources(data);
    } catch (err) {
      setError("Error loading course content");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618l-4.553 2.276A1 1 0 0014 12.382V15a1 1 0 001 1h4a1 1 0 001-1v-2.618a1 1 0 00-.447-.894L15 10z" />
          </svg>
        );
      case 'PDF':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012 3H7a1 1 0 00-1 1v4.586a1 1 0 00.293.707l5.414 5.414a1 1 0 001.707.293V21a2 2 0 01-2 2z" />
          </svg>
        );
      case 'ASSIGNMENT':
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2v4a2 2 0 01-2 2H9a2 2 0 01-2-2V5z" />
          </svg>
        );
      case 'LINK':
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 001.414 1.414l4-4a4 4 0 011.414-1.414l-4-4a4 4 0 00-5.656 0l-4 4a4 4 0 001.414 5.656l4-4a4 4 0 011.414-1.414l-4-4a4 4 0 00-5.656 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'VIDEO': return 'bg-red-50 border-red-200 text-red-700';
      case 'PDF': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'ASSIGNMENT': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'LINK': return 'bg-green-50 border-green-200 text-green-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">My Courses</h1>
        <p className="text-slate-500 mt-2">Access your learning materials and assignments</p>
      </div>

      {resources.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 0 6.253z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Content Available</h3>
          <p className="text-slate-500">Your instructor hasn't assigned any learning materials yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <div key={resource.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {/* Content Type Badge */}
              <div className={`px-3 py-2 text-sm font-semibold ${getContentTypeColor(resource.type)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getContentTypeIcon(resource.type)}
                    <span className="ml-2">{resource.type}</span>
                  </div>
                  {resource.type === 'ASSIGNMENT' && resource.assignmentScore !== null && (
                    <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                      Score: {resource.assignmentScore}
                    </span>
                  )}
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{resource.title}</h3>
                {resource.description && (
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">{resource.description}</p>
                )}

                {/* Content Preview */}
                {resource.type === 'VIDEO' && (
                  <div className="bg-slate-100 rounded-lg p-4 mb-4">
                    <div className="aspect-video bg-slate-200 rounded flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197 2.132a1 1 0 001.555-.832V12a1 1 0 00-1.555-.832zM15 18l-3 3m0-12l3 3m3-12l3 3" />
                      </svg>
                    </div>
                  </div>
                )}

                {resource.type === 'PDF' && (
                  <div className="bg-slate-100 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <svg className="w-8 h-8 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012 3H7a1 1 0 00-1 1v4.586a1 1 0 00.293.707l5.414 5.414a1 1 0 001.707.293V21a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-slate-600">PDF Document</span>
                    </div>
                  </div>
                )}

                {resource.type === 'LINK' && (
                  <div className="bg-slate-100 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <svg className="w-8 h-8 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 001.414 1.414l4-4a4 4 0 011.414-1.414l-4-4a4 4 0 00-5.656 0l-4 4a4 4 0 001.414 5.656l4-4a4 4 0 011.414-1.414l-4-4a4 4 0 00-5.656 0z" />
                      </svg>
                      <span className="text-slate-600">External Link</span>
                    </div>
                  </div>
                )}

                {resource.type === 'ASSIGNMENT' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg className="w-8 h-8 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2v4A2 2 0 01-2 2H9a2 2 0 01-2-2V5z" />
                        </svg>
                        <span className="text-yellow-700 font-medium">Assignment</span>
                      </div>
                      {resource.assignmentScore !== null && (
                        <div className="text-right">
                          <span className="text-lg font-bold text-green-600">{resource.assignmentScore}</span>
                          <p className="text-xs text-green-600">Score</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center font-medium"
                >
                  {resource.type === 'VIDEO' && 'Watch Video'}
                  {resource.type === 'PDF' && 'Open PDF'}
                  {resource.type === 'ASSIGNMENT' && 'View Assignment'}
                  {resource.type === 'LINK' && 'Open Link'}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V8a2 2 0 00-2-2h-2m4 0V9a2 2 0 012 2v6a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2h-2m-6 4h12" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
